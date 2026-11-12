#!/usr/bin/env python3
"""Call the deployed ask-the-word function as a test user. Usage: ask.py <en|ml> "<question>" [conversationId]"""
import json, os, sys, requests

def session(email=None, password=None):
    url, anon = os.environ['SUPABASE_URL'], os.environ['SUPABASE_ANON_KEY']
    r = requests.post(f'{url}/auth/v1/token?grant_type=password', headers={'apikey': anon},
                      json={'email': email or os.environ['TEST_USER_A_EMAIL'], 'password': password or os.environ['TEST_USER_A_PASSWORD']}, timeout=30)
    r.raise_for_status()
    return url, {'apikey': anon, 'Authorization': 'Bearer ' + r.json()['access_token'], 'Content-Type': 'application/json'}

def ask(url, headers, body):
    r = requests.post(f'{url}/functions/v1/ask-the-word', headers=headers, json=body, timeout=150)
    try:
        return r.status_code, r.json()
    except ValueError:
        return r.status_code, {'raw': r.text[:300]}

if __name__ == '__main__':
    url, h = session()
    body = {'action': 'status'} if sys.argv[1] == 'status' else {'language': sys.argv[1], 'question': sys.argv[2]}
    if len(sys.argv) > 3:
        body['conversationId'] = sys.argv[3]
    status, out = ask(url, h, body)
    print(status, json.dumps(out, ensure_ascii=False, indent=1))
