# EdgeOne 国内镜像（可选 · 非主链）

**主分享链已改为 GitHub Pages HTTPS**（见 Project `docs/receipt-public-links.md`）。EdgeOne 仅在需要大陆加速且愿意备案 / 登录腾讯云时再开。

免费且无 ICP 时，EdgeOne **无法**提供长期稳定的大陆直连默认域名（含中国大陆加速区默认域多为短时预览链）。不要把认领流程当推广前置。

## 仓库里已备好的配置（暂不强制）

- `edgeone.json` — 静态站 + HSTS / CSP  
- `.github/workflows/edgeone.yml` — 仅当仓库 Secret `EDGEONE_API_TOKEN` 存在时部署；缺省跳过，不影响 GitHub Pages  

## 若以后仍要开 EdgeOne

1. https://console.cloud.tencent.com/edgeone/makers → 立即开通（免费）  
2. 导入 GitHub 仓库 `huiminjia13-a11y/comparison-receipt`，或上传静态文件  
3. 域名管理 → HTTPS 配置 → 开 **强制 HTTPS** + **HSTS**  
4. 含中国大陆加速：自定义域名须 ICP 备案  
5. 可选：建 API Token → GitHub Secret `EDGEONE_API_TOKEN` → 推 `main` 触发 `Deploy EdgeOne Pages`
