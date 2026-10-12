# 哪吒学汉字 · 云端账号版

基于 [dhjz/hanzi-study](https://github.com/dhjz/hanzi-study) 的 MIT 开源项目改造，保留汉字、笔画、听音、数学及古诗内容。

- 学习者只输入管理员分配的学习密码，无需手机号和注册。
- 首次登录绑定当前浏览器，一个学习密码只允许一个浏览器身份。
- 汉字关卡、数学答题、古诗选择与设置保存至 Supabase，短暂断网时本机暂存并自动补传。
- 管理后台支持批量生成（每批 1–100 个）、自定义密码、改名、重置密码、停用/启用、解绑换机。
- 支持手机、平板、电脑；GitHub Pages 子目录部署。
- 后端使用 Supabase Edge Function + PostgreSQL + Supabase Auth 管理员身份。

**当前仅完成本地实现与测试，生产发布等待用户登录 GitHub、Supabase。**

部署步骤、生产验收和使用边界见 [DEPLOYMENT.md](DEPLOYMENT.md)。

本地预览：`node scripts/build.mjs` 后运行 `node scripts/preview.mjs`。
未配置生产 Supabase 时，预览只能展示登录界面；学习密码需云端部署完成才能使用。

原始项目保留于用户 D 盘原目录，云端改造另存新目录。
