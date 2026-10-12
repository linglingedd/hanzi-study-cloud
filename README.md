# 哪吒学汉字 · 云端账号版

基于 [dhjz/hanzi-study](https://github.com/dhjz/hanzi-study) 的 MIT 开源项目改造，保留汉字、笔画、听音、数学及古诗内容。

- 学习者只输入管理员分配的学习密码，无需手机号和注册。
- 首次登录绑定当前浏览器，一个学习密码只允许一个浏览器身份。
- 汉字关卡、数学答题、古诗选择与设置保存至 Supabase，短暂断网时本机暂存并自动补传。
- 管理后台支持批量生成（每批 1–100 个）、自定义密码、改名、重置密码、停用/启用、解绑换机。
- 支持手机、平板、电脑；GitHub Pages 子目录部署。
- 后端使用 Supabase Edge Function + PostgreSQL + Supabase Auth 管理员身份。

学习入口：https://linglingedd.github.io/hanzi-study-cloud/

管理入口：https://linglingedd.github.io/hanzi-study-cloud/admin.html

2026-10-12 已部署至 GitHub Pages 与 Supabase，真实云端接口 10 项、线上浏览器 27 项检查通过。首批 100 个学习密码已启用、待首次绑定。管理员需在 Supabase Authentication 创建自己的邮箱账号，再将该用户加入 `study_admins`；公共注册已关闭。当前管理员首次设置待本人完成。

部署步骤、生产验收和使用边界见 [DEPLOYMENT.md](DEPLOYMENT.md)。

本地预览：`node scripts/build.mjs` 后运行 `node scripts/preview.mjs`。
生产配置已填入公开项目地址和 publishable key；学习密码、服务器 secret 不在公开代码中。

原始项目保留于用户 D 盘原目录，云端改造另存新目录。
