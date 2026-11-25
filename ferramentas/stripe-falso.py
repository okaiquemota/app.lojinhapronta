# Stripe de mentira, para testar a mensalidade sem cartão de verdade.
#
#   python3 ferramentas/stripe-falso.py            (escuta em 127.0.0.1:9998)
#   STRIPE_API_TESTE=http://127.0.0.1:9998         (no .dev.vars)
#
# Simular a lojista pagando o checkout:   POST /_completar  {"id": "cs_..."}
# Simular cartão recusado / cancelamento: POST /_status     {"id": "sub_...", "status": "past_due"}
import json, time, itertools
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qsl

ids = itertools.count(1)
precos, sessoes, assinaturas = {}, {}, {}


def aninhar(pares):
    """'a[b][0]=1' → {'a': {'b': {'0': '1'}}}"""
    raiz = {}
    for chave, valor in pares:
        partes = chave.replace(']', '').split('[')
        no = raiz
        for p in partes[:-1]:
            no = no.setdefault(p, {})
        no[partes[-1]] = valor
    return raiz


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def resp(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def corpo(self):
        bruto = self.rfile.read(int(self.headers.get('Content-Length', 0) or 0)).decode()
        if self.headers.get('Content-Type', '').startswith('application/json'):
            return json.loads(bruto or '{}')
        return aninhar(parse_qsl(bruto))

    def do_GET(self):
        u = urlparse(self.path)
        q = aninhar(parse_qsl(u.query))
        if u.path == '/v1/prices':
            chave = (q.get('lookup_keys') or {}).get('0')
            return self.resp(200, {'data': [p for p in precos.values() if p['lookup_key'] == chave]})
        if u.path.startswith('/v1/checkout/sessions/'):
            s = sessoes.get(u.path.rsplit('/', 1)[1])
            return self.resp(200, s) if s else self.resp(404, {'error': {'message': 'No such session'}})
        if u.path.startswith('/v1/subscriptions/'):
            a = assinaturas.get(u.path.rsplit('/', 1)[1])
            return self.resp(200, a) if a else self.resp(404, {'error': {'message': 'No such subscription'}})
        if u.path == '/_estado':
            return self.resp(200, {'precos': precos, 'sessoes': sessoes, 'assinaturas': assinaturas})
        self.resp(404, {})

    def do_POST(self):
        u = urlparse(self.path)
        c = self.corpo()
        if u.path == '/v1/prices':
            pid = f'price_{next(ids)}'
            precos[pid] = {'id': pid, 'unit_amount': int(c['unit_amount']), 'currency': c['currency'], 'lookup_key': c.get('lookup_key'), 'recurring': c.get('recurring'), 'product_data': c.get('product_data')}
            return self.resp(200, precos[pid])
        if u.path == '/v1/checkout/sessions':
            sid = f'cs_test_{next(ids):08d}abcdef'
            sessoes[sid] = {'id': sid, 'url': f'https://checkout.stripe-falso.exemplo/{sid}', 'status': 'open', 'mode': c.get('mode'),
                            'client_reference_id': c.get('client_reference_id'), 'customer': c.get('customer'), 'customer_email': c.get('customer_email'),
                            'subscription': None, 'metadata': c.get('metadata', {}), 'pedido': c}
            return self.resp(200, sessoes[sid])
        if u.path == '/_completar':
            s = sessoes[c['id']]
            pedido = s['pedido']
            sd = pedido.get('subscription_data', {})
            sub = f'sub_{next(ids)}'
            fim = int(sd['trial_end']) if sd.get('trial_end') else int(time.time()) + 30 * 86400
            assinaturas[sub] = {'id': sub, 'status': 'trialing' if sd.get('trial_end') else 'active', 'customer': s['customer'] or f'cus_{next(ids)}',
                                'cancel_at_period_end': False, 'trial_end': int(sd['trial_end']) if sd.get('trial_end') else None, 'metadata': sd.get('metadata', {}),
                                'items': {'data': [{'id': f'si_{next(ids)}', 'current_period_end': fim, 'price': {'id': pedido['line_items']['0']['price'], 'unit_amount': 0}}]}}
            s.update(status='complete', subscription=sub, customer=assinaturas[sub]['customer'])
            return self.resp(200, s)
        if u.path == '/_status':
            assinaturas[c['id']]['status'] = c['status']
            if 'fim' in c:
                assinaturas[c['id']]['items']['data'][0]['current_period_end'] = int(c['fim'])
            return self.resp(200, assinaturas[c['id']])
        if u.path.startswith('/v1/subscriptions/'):
            a = assinaturas.get(u.path.rsplit('/', 1)[1])
            if not a:
                return self.resp(404, {'error': {'message': 'No such subscription'}})
            if 'cancel_at_period_end' in c:
                a['cancel_at_period_end'] = c['cancel_at_period_end'] == 'true'
            if 'items' in c:
                a['items']['data'][0]['price'] = {'id': c['items']['0']['price'], 'unit_amount': 0}
            if 'metadata' in c:
                a['metadata'].update(c['metadata'])
            a['ultima_alteracao'] = c
            return self.resp(200, a)
        if u.path == '/v1/billing_portal/sessions':
            return self.resp(200, {'url': f'https://portal.stripe-falso.exemplo/{c.get("customer")}'})
        self.resp(404, {})


HTTPServer(('127.0.0.1', 9998), H).serve_forever()
