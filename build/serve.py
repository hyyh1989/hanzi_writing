#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
在 Mac 上起一个小服务器，让同一个 WiFi 下的 iPad / 手机直接打开 app。
不需要部署、不需要任何账号。

    /usr/local/bin/python3 build/serve.py

跑起来后会打印一个 http://192.168.x.x:8080 的网址，在 iPad 的 Safari 里输进去就行。
按 Ctrl+C 停止。Mac 合盖或关掉这个窗口，网址就失效了——这是临时测试用的。
"""
import http.server, os, socket, sys

PORT = 8080
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'app')
APP = os.path.abspath(APP)

TEXT = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.svg': 'image/svg+xml'}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=APP, **kw)

    def guess_type(self, path):
        # Python 自带的 http.server 不发 charset，中文会乱码 —— 这里补上
        ext = os.path.splitext(str(path))[1].lower()
        if ext in TEXT:
            return TEXT[ext] + '; charset=utf-8'
        return super().guess_type(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass   # 安静点，别刷屏


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


def main():
    if not os.path.exists(os.path.join(APP, 'index.html')):
        sys.exit('找不到 app/index.html —— 请在 hanzi_writing 目录下运行')
    ip = lan_ip()
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print('')
    print('  在 iPad 的 Safari 里打开这个地址：')
    print('')
    print('      http://%s:%d' % (ip, PORT))
    print('')
    print('  （iPad 要和这台 Mac 连同一个 WiFi）')
    print('  按 Ctrl+C 停止')
    print('')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止')


if __name__ == '__main__':
    main()
