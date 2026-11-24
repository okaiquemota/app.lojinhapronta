# Mercado Pago de mentira para testar o ciclo pagamento → liberação sem dinheiro de verdade.
import json, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
estado = {"pagamentos": {}, "ultima_ref": None, "valor": None}
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def resp(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/users/me': return self.resp(200, {"id": 99887766, "email": "loja-teste@exemplo.com"})
        if u.path == '/v1/payments/search':
            ref = parse_qs(u.query).get('external_reference', [''])[0]
            return self.resp(200, {"results": [p for p in estado["pagamentos"].values() if p["external_reference"] == ref], "paging": {}})
        if u.path.startswith('/v1/payments/'):
            p = estado["pagamentos"].get(u.path.rsplit('/',1)[1])
            return self.resp(200, p) if p else self.resp(404, {"message": "not found"})
        if u.path == '/_estado': return self.resp(200, estado)
        if u.path.startswith('/preapproval/'):
            a = estado.setdefault("assinaturas", {}).get(u.path.rsplit('/',1)[1])
            return self.resp(200, a) if a else self.resp(404, {"message": "not found"})
        self.resp(404, {})
    def do_POST(self):
        u = urlparse(self.path)
        corpo = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or 0) or b'{}')
        if u.path == '/checkout/preferences':
            estado["ultima_ref"] = corpo["external_reference"]
            estado["valor"] = sum(i["unit_price"] for i in corpo["items"])
            estado["ultima_preferencia"] = corpo
            return self.resp(201, {"id": "pref-1", "init_point": "https://mp-falso.exemplo/checkout?pref=pref-1"})
        if u.path == '/preapproval':
            a = dict(corpo, id="assin-1", status="pending", init_point="https://mp-falso.exemplo/assinar?id=assin-1", next_payment_date=None)
            estado.setdefault("assinaturas", {})["assin-1"] = a
            return self.resp(201, a)
        if u.path == '/_assinatura':
            a = estado["assinaturas"][corpo["id"]]; a.update(corpo); return self.resp(200, a)
        if u.path == '/_pagar':  # simula a compradora pagando
            pid = str(corpo["id"])
            estado["pagamentos"][pid] = {"id": int(pid), "status": corpo.get("status", "approved"), "status_detail": "", "external_reference": corpo.get("ref", estado["ultima_ref"]),
                "transaction_amount": corpo.get("valor", estado["valor"]), "currency_id": "BRL", "payment_type_id": "bank_transfer", "payment_method_id": "pix", "date_approved": None, "date_created": ""}
            return self.resp(200, estado["pagamentos"][pid])
        self.resp(404, {})
def do_PUT(self):
    u = urlparse(self.path)
    corpo = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)) or 0) or b'{}')
    a = estado.setdefault("assinaturas", {}).get(u.path.rsplit('/',1)[1])
    if not a: return self.resp(404, {})
    ar = corpo.pop("auto_recurring", None)
    a.update(corpo)
    if ar: a["auto_recurring"].update(ar)
    self.resp(200, a)
H.do_PUT = do_PUT
HTTPServer(('127.0.0.1', 9999), H).serve_forever()
