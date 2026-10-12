# GitHub Pages + Supabase 部署记录

## 当前状态（2026-10-12）

- 已完成本地开发与测试，尚未创建生产 Supabase 项目、尚未发布 GitHub Pages。
- 首批 100 个密码在项目外的「管理员私密资料」中，状态为待部署后启用。
- 用户要求在需要注册、登录的环节暂停，由用户亲自操作。
- 前端配置 `js/config.js` 故意为空；完成生产配置前无法登录，不能将本地预览视为已上线。

## 发布顺序

1. 用户登录 GitHub 和 Supabase。使用用户指定账号；不擅自开通付费套餐。
2. 创建 Supabase 项目；执行 `supabase/migrations/202610120001_cloud_accounts.sql`。
3. 将私密目录中 `supabase.private.env` 的 `STUDY_PEPPER` 设置为 Supabase Edge Function secret。该值与首批密码摘要配套，务必备份，不可随意更换。
4. 确定 GitHub Pages 地址，并将其 **origin** 设置为 `ALLOWED_ORIGINS`，例如 `https://YOURNAME.github.io`，不要带仓库路径。多个 origin 使用英文逗号分隔；生产不保留 localhost。
5. 部署函数 `supabase functions deploy study-api --no-verify-jwt`。本函数自行验证学习会话及管理员 Supabase Auth 身份；不能改成对自定义学习 token 执行 Supabase JWT 校验。
6. 执行私密目录的 `initial-accounts.private.sql`，确认 100 个账号全部未绑定。SQL 以固定 UUID 做幂等处理，不要重新随机生成第二批。
7. 在 Supabase Auth 管理界面添加管理员邮箱用户，设置强密码并确认邮箱；关闭公共注册。将其 `auth.users.id` 加入 `public.study_admins(user_id)`，只给实际管理员授权。管理页不开放注册。
8. 创建 GitHub 仓库，上传本项目代码。学习材料来源为原 MIT 许可项目，保留 LICENSE；项目外所有私密文件不上传。
9. GitHub 仓库变量配置：`SUPABASE_URL` 和 `SUPABASE_PUBLISHABLE_KEY`（Supabase publishable key 或旧版 anon key）。严禁使用 service_role、sb_secret 或 STUDY_PEPPER。
10. Pages 的发布源选择 GitHub Actions，推送 `main` 后由 `.github/workflows/pages.yml` 发布 `dist`。
11. 使用一个额外的临时验收账号在真实外网执行以下检查；验证结束停用临时账号，保持首批 100 个账号未绑定。

## 生产验收

- 网站、登录页、管理页、数学页、古诗页的 Pages 子路径均可访问；未登录直接访问学习页会跳到登录页。
- 管理员能登录并看到首批 100 个账号，普通 Supabase 用户无管理权限。
- 第一个浏览器能登录；第二个浏览器用同一学习密码被拒绝。
- 修改汉字进度、数学答题和古诗选择，刷新及退出再登录后可恢复。
- 后台解绑后旧会话无效，新浏览器可登录且保留进度；密码重置和停用有效。
- 短暂断网时显示本机暂存，重连后成功保存；云端不可用时不显示虚假的保存成功。
- 实际检查 Supabase REST 匿名访问表和 RPC 均被拒绝。
- 检查 HTTPS、生产来源跨域设置、静态资源和音频响应；手机实际打开复核。
- 记录最终网站、后台、仓库、Supabase 项目地址，更新密码清单的状态为「未绑定」。

## 使用边界

- 设备绑定是持久浏览器随机标识，不是硬件序列号。换浏览器、无痕窗口或清除网站数据后需要后台解绑；此方案不能抵御主动复制整个浏览器存储的高级绕过。
- GitHub Pages 提供公开静态文件，登录保护账号和云端进度，不能把静态教材文件变成私有内容。需要对教材本身实施访问控制时，应改用受保护的文件服务。
- 互联网访问取决于网络和云平台状态；免费 Supabase 项目可能按当期规则因不活跃而暂停，免费套餐不提供全天候可用性保证。若必须持续可用，需用户自行选择合适套餐，不能擅自付费。
- 首批密码以 20 位随机字母和数字生成（100 bit 随机性），数据库只保存服务器 HMAC 摘要；明文仅保留在用户的私密清单中。
- 旧版匿名/手机号本机进度不会自动导入新账号，避免不同用户的学习记录混在一起。

## 本地验证

运行环境 Node.js 22.18+。前端保留原生 JS 与本地 Vue 库，不依赖外部 CDN。

```powershell
pnpm install
node --experimental-strip-types --test --test-isolation=none tests/database.test.mjs tests/edge.test.mjs
node node_modules/typescript/bin/tsc --noEmit --strict --allowImportingTsExtensions --module esnext --target es2022 --lib es2022,dom tests/deno.d.ts supabase/functions/study-api/index.ts
node scripts/build.mjs
node scripts/preview.mjs
```

浏览器测试 `tests/browser-check.mjs` 需要 Playwright 与 Chromium/Edge，并在另一个终端先运行 preview。
通过 `PLAYWRIGHT_MODULE` 指定本机已有的 Playwright 包路径，`BROWSER_EXECUTABLE` 指定浏览器路径。
测试使用真实迁移 SQL 的本地 PostgreSQL/WASM 数据库和真实 Edge 函数处理逻辑，模拟 Supabase 的 HTTP 传输；不能替代生产 Supabase 验收。

## 数据与恢复

- 不要丢失或公开 `STUDY_PEPPER`；恢复数据库时需要相同 secret，否则已发密码不能验证。
- 按所选 Supabase 套餐建立数据库备份方案。账号数据在 `study_accounts`；会话可撤销重建。
- 后台创建/重置返回的新密码需及时下载，关闭弹窗后不再从数据库读取明文。
- 学习进度按账号保存；汉字已完成关卡只增不减，避免延迟请求覆盖新进度。
