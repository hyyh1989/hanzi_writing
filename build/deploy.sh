#!/usr/bin/env bash
# 把 app/ 部署到 Cloudflare Pages，拿到一个永久网址（免费）。
#   ./build/deploy.sh
#
# 需要先登录 Cloudflare，二选一：
#   A) npx wrangler login                     （浏览器授权，一次就好）
#   B) export CLOUDFLARE_API_TOKEN=xxx        （API Token，不走浏览器回调，更稳）
# 会先把 app/ 复制一份、盖上版本时间戳再传，源文件不动。
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f app/index.html ] || { echo "找不到 app/index.html"; exit 1; }

# ── 先查登录，别等准备完 30M 文件才发现没登录 ──
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if ! npx --yes wrangler whoami 2>&1 | grep -q "You are logged in\|Account Name\|Account ID"; then
    cat <<'TIP'

⚠️  还没登录 Cloudflare，先做这一步（二选一）：

  A) 浏览器授权：
       npx wrangler login
     浏览器打开后【尽快】点 Allow，只点一次，别刷新也别按返回——
     那个授权凭证是一次性的，重复提交就会报
     "The consent verifier has already been used"。
     开着 VPN / 代理的话先关掉，否则本地回调端口收不到。

  B) 用 API Token（不走浏览器回调，更稳）：
       1. 打开 https://dash.cloudflare.com/profile/api-tokens
       2. Create Token → 选模板 "Edit Cloudflare Workers"
       3. 复制生成的 token（只显示一次）
       4. 回终端执行（token 别提交进 git，也别发给任何人）：
            export CLOUDFLARE_API_TOKEN=粘贴你的token
            ~/MyProjects/hanzi_writing/build/deploy.sh

登录好之后再跑一次本脚本。

TIP
    exit 1
  fi
fi

STAMP="$(date '+%Y-%m-%d %H:%M')"
OUT="$(mktemp -d)/app"
mkdir -p "$OUT"
cp -R app/. "$OUT/"
/usr/local/bin/python3 - "$OUT/index.html" "$STAMP" <<'PY'
import io, sys
p, stamp = sys.argv[1], sys.argv[2]
s = io.open(p, encoding='utf-8').read()
io.open(p, 'w', encoding='utf-8').write(s.replace('__BUILD__', stamp))
PY

echo "版本：$STAMP"
echo "文件：$(find "$OUT" -type f | wc -l | tr -d ' ') 个，$(du -sh "$OUT" | cut -f1)"
npx --yes wrangler pages deploy "$OUT" --project-name hanzi-writing
echo
echo "部署完成。iPad 上打开网址 → 设置 ⚙ → 看「版本」是不是 $STAMP"
echo "如果还是旧的，点设置里的「检查更新」。"
