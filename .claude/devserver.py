"""Servidor estático de desenvolvimento (sem cache) + recepção de artes.

Também expõe POST /__upload, usado uma única vez para trazer os ícones do
fortnite.gg. O site responde 403 para cliente automatizado, então quem busca as
imagens é o próprio navegador, com a página aberta; este endpoint só grava os
bytes em scraper/downloads/. É ferramenta de desenvolvimento e escuta apenas em
127.0.0.1 — não use em nada exposto.
"""
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "scraper" / "downloads"
SAFE = re.compile(r"^[A-Za-z0-9_-]+$")


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        # Private Network Access: sem isso o Chrome barra o preflight vindo de
        # uma página pública (https) para um servidor local.
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/__upload":
            self.send_error(404)
            return

        query = parse_qs(url.query)
        parent = (query.get("parent") or [""])[0]
        variant = (query.get("variant") or [""])[0]
        if not SAFE.match(parent) or not SAFE.match(variant):
            self.send_error(400, "parent/variant invalidos")
            return

        length = int(self.headers.get("Content-Length") or 0)
        if not 0 < length <= 5_000_000:
            self.send_error(400, "tamanho invalido")
            return

        DOWNLOADS.mkdir(parents=True, exist_ok=True)
        target = DOWNLOADS / f"{parent}__{variant}.webp"
        target.write_bytes(self.rfile.read(length))

        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(f"ok {target.name}\n".encode())

    def log_message(self, fmt, *args):
        if "__upload" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    handler = partial(DevHandler, directory=str(ROOT))
    print(f"servindo {ROOT} em http://localhost:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
