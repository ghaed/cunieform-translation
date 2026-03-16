#!/usr/bin/env python3
"""
Cuneiform Translation Web Server

Wraps the Sumerian-Translation-Pipeline with a clean web interface.
Tablets are pre-loaded from curated ATF files; translations are run
on-demand via the ML pipeline and cached to disk.
"""

import os
import json
import subprocess
import threading
import re
import shutil
from datetime import datetime
from flask import Flask, jsonify, render_template, abort

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIPELINE_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'Sumerian-Translation-Pipeline'))
CACHE_DIR = os.path.join(BASE_DIR, 'cache')
ATF_DIR = os.path.join(BASE_DIR, 'atf')

os.makedirs(CACHE_DIR, exist_ok=True)

app = Flask(__name__)

# Serialize pipeline executions to prevent output-directory conflicts
_pipeline_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

def load_tablets():
    with open(os.path.join(BASE_DIR, 'tablets.json')) as f:
        return json.load(f)


def parse_atf_sections(atf_content, translations):
    """
    Walk every line of the ATF text, classify it, and (for numbered content
    lines) attach the matching translation string.

    Returns a list of dicts, each with at least {"type": ..., "content": ...}.
    Content lines additionally carry {"number": ..., "translation": ...}.
    """
    trans_idx = 0
    sections = []

    for raw_line in atf_content.split('\n'):
        stripped = raw_line.strip()
        if not stripped:
            continue

        # Numbered content line: first character is a digit.
        # Handles "1.", "1'.", "12.", etc.
        if stripped[0].isdigit():
            dot_pos = stripped.find('.')
            if dot_pos > 0:
                line_num = stripped[:dot_pos]
                content = stripped[dot_pos + 1:].strip()
                translation = ''
                if trans_idx < len(translations):
                    translation = translations[trans_idx].strip()
                    trans_idx += 1
                sections.append({
                    'type': 'content',
                    'number': line_num,
                    'content': content,
                    'translation': translation,
                })
                continue

        # ATF structural / metadata lines
        if stripped.startswith('&'):
            sections.append({'type': 'id_line', 'content': stripped})
        elif stripped.startswith('@'):
            sections.append({'type': 'structural', 'content': stripped})
        elif stripped.startswith('#'):
            sections.append({'type': 'comment', 'content': stripped})
        elif stripped.startswith('$'):
            sections.append({'type': 'dollar', 'content': stripped})
        else:
            sections.append({'type': 'other', 'content': stripped})

    return sections


# ---------------------------------------------------------------------------
# Pipeline integration
# ---------------------------------------------------------------------------

def _check_pipeline_ready() -> dict:
    """Return a dict describing which pipeline components are available."""
    info = {
        'pos_model': os.path.exists(
            os.path.join(PIPELINE_DIR, 'Saved_Models', 'POS', 'POS_CRF.pkl')
        ),
        'ner_model': os.path.exists(
            os.path.join(PIPELINE_DIR, 'Saved_Models', 'NER', 'NER_CRF.pkl')
        ),
        'trans_model': os.path.exists(
            os.path.join(PIPELINE_DIR, 'Translation_Models', 'Back_Translation.pt')
        ),
        'pipeline_script': os.path.exists(os.path.join(PIPELINE_DIR, 'pipeline.py')),
    }
    return info


def run_pipeline(tablet_id, atf_path):
    """
    Execute pipeline.py for *atf_path* and return a result dict with keys:
      status, translations, sumerian_lines, pipeline_stdout, pipeline_stderr
    """
    # Use a per-tablet output directory so concurrent runs don't collide
    output_dir = os.path.join(PIPELINE_DIR, f'ATF_OUTPUT_{tablet_id}') + os.sep
    readiness = _check_pipeline_ready()

    with _pipeline_lock:
        try:
            proc = subprocess.run(
                [
                    'python3', 'pipeline.py',
                    '-i', atf_path,
                    '-a', 'True',
                    '-o', output_dir,
                ],
                cwd=PIPELINE_DIR,
                capture_output=True,
                text=True,
                timeout=360,   # 6-minute hard cap
            )
            stdout = proc.stdout
            stderr = proc.stderr
        except subprocess.TimeoutExpired:
            return {
                'status': 'timeout',
                'translations': [],
                'sumerian_lines': [],
                'pipeline_stdout': '',
                'pipeline_stderr': 'Pipeline timed out after 6 minutes.',
            }
        except Exception as exc:
            return {
                'status': 'error',
                'translations': [],
                'sumerian_lines': [],
                'pipeline_stdout': '',
                'pipeline_stderr': str(exc),
            }

    # Collect output files
    trans_file = os.path.join(output_dir, 'trans_pipeline.txt')
    pipeline_file = os.path.join(output_dir, 'pipeline.txt')

    translations = []
    sumerian_lines = []

    if os.path.exists(trans_file):
        with open(trans_file) as f:
            translations = [line.strip() for line in f]

    if os.path.exists(pipeline_file):
        with open(pipeline_file) as f:
            sumerian_lines = [line.strip() for line in f]

    # Clean up temporary output directory
    shutil.rmtree(output_dir, ignore_errors=True)

    if translations:
        status = 'translated'
    elif not readiness['trans_model']:
        status = 'no_translation_model'
    elif not readiness['pos_model']:
        status = 'no_pos_model'
    else:
        status = 'pipeline_failed'

    return {
        'status': status,
        'translations': translations,
        'sumerian_lines': sumerian_lines,
        'pipeline_stdout': stdout[-3000:] if stdout else '',
        'pipeline_stderr': stderr[-3000:] if stderr else '',
        'readiness': readiness,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/tablets')
def get_tablets():
    return jsonify(load_tablets())


@app.route('/api/translate/<tablet_id>')
def translate(tablet_id):
    tablets = load_tablets()
    tablet_map = {t['id']: t for t in tablets}

    if tablet_id not in tablet_map:
        abort(404, description=f'Tablet {tablet_id} not found')

    # --- Serve from disk cache if available and successful ---
    cache_file = os.path.join(CACHE_DIR, f'{tablet_id}.json')
    if os.path.exists(cache_file):
        with open(cache_file) as f:
            cached = json.load(f)
        # Only trust cached entries that actually have translation data
        # or that correctly record "no model available" state
        if cached.get('status') in ('translated', 'no_translation_model',
                                     'no_pos_model'):
            return jsonify(cached)

    # --- Load ATF source ---
    atf_path = os.path.join(ATF_DIR, f'{tablet_id}.atf')
    if not os.path.exists(atf_path):
        abort(404, description=f'ATF file for {tablet_id} not found')

    with open(atf_path) as f:
        raw_atf = f.read()

    # --- Run pipeline ---
    result = run_pipeline(tablet_id, atf_path)

    # --- Build structured sections ---
    sections = parse_atf_sections(raw_atf, result['translations'])

    tablet_meta = tablet_map[tablet_id]

    response = {
        'tablet_id': tablet_id,
        'name': tablet_meta['name'],
        'title': tablet_meta['title'],
        'description': tablet_meta['description'],
        'period': tablet_meta['period'],
        'provenance': tablet_meta.get('provenance', ''),
        'genre': tablet_meta['genre'],
        'cdli_image_url': tablet_meta.get('image_url', f'https://cdli.mpiwg-berlin.mpg.de/dl/photo/{tablet_id}.jpg'),
        'cdli_url': f'https://cdli.mpiwg-berlin.mpg.de/artifacts/{tablet_id}',
        'raw_atf': raw_atf,
        'sections': sections,
        'status': result['status'],
        'translation_count': len(result['translations']),
        'pipeline_stderr': result.get('pipeline_stderr', ''),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }

    # --- Cache to disk ---
    with open(cache_file, 'w') as f:
        json.dump(response, f, indent=2, ensure_ascii=False)

    return jsonify(response)


@app.route('/api/cache/clear/<tablet_id>', methods=['DELETE'])
def clear_cache(tablet_id):
    cache_file = os.path.join(CACHE_DIR, f'{tablet_id}.json')
    if os.path.exists(cache_file):
        os.remove(cache_file)
        return jsonify({'message': f'Cache cleared for {tablet_id}'})
    return jsonify({'message': 'No cache entry found'})


@app.route('/api/status')
def pipeline_status():
    return jsonify(_check_pipeline_ready())


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
