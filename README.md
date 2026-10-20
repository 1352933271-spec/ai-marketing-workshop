# AI 出海营销工坊

刘嘉略 · 0120251050  
作业2：Vue 3 + Express + MongoDB 全栈工程骨架。

## 本次实现

- Vue 3 / Vite前端，Element Plus、Pinia、Vue Router、Axios；ECharts已安装，图表在后续作业实现。
- 页面自动请求真实的`GET /api/health`，展示成功或失败；控制台打印对象和完整JSON。
- Express路由、控制器、服务、配置、模型和中间件分层；CORS、JSON/表单解析、404与统一错误信封。
- Mongoose Product、MarketingAsset模型，时间戳、必填及枚举约束、商品引用索引。
- 数据库断开时健康接口返回503，而非伪报成功；启动必须先连接MongoDB。
- 尚未实现上传、AI调用、文案、生图、看板和ZIP业务；模块卡片仅展示后续规划。

## 环境及启动

需要Node.js 20.19+ / 22.12+或更高的受支持版本、npm、Git、MongoDB Community或Atlas。本次在Node 24验证。

在项目根目录执行：

```powershell
npm --prefix client ci
npm --prefix server ci
Copy-Item server/.env.example server/.env
```

已有`.env`时勿覆盖。检查其中的MONGO_URI、PORT和CORS_ORIGIN。有Docker的机器可启动数据库：

```powershell
docker compose up -d mongo
```

也可使用本机MongoDB或Atlas，修改`server/.env`中的连接串。Compass连接同一URI可检查`aimarketing`库。不要将连接串中的密码提交到仓库。

然后开两个终端，在项目根目录分别执行：

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```

打开 http://localhost:5174 ，按F12选择Console查看`[health] 后端响应`；直接访问 http://localhost:3100/api/health 也可查看JSON：

```json
{"code":0,"message":"ok","data":{"status":"up","db":"connected","time":"运行时UTC时间"}}
```

开发API基址见`client/.env.development`，生产同域留空；端口变化时同步修改后端PORT、前端VITE_API_BASE或后端CORS_ORIGIN，再重启。前端环境变量会进入构建产物，不得放密钥。

## 验证

```powershell
npm run check:db
npm run build
```

模型验证脚本会在真实MongoDB创建Product及关联MarketingAsset，验证读取、populate、时间戳和必填规则，最后只删除本次创建的测试文档。若要在Compass观察，可在脚本读取步骤设置断点；脚本验证不代表已经完成Compass人工检查。

## 目录

```text
client/src/api/          Axios和健康接口
client/src/components/  通用组件
client/src/views/       联调页面
client/src/stores/      Pinia健康状态
client/src/router/      路由
server/src/config/      环境变量和MongoDB连接
server/src/routes/      API路由
server/src/controllers/ 请求与响应
server/src/services/    后续业务与AI调用
server/src/models/      Product与MarketingAsset
server/src/middlewares/ 统一异常与404
server/uploads/         上传目录占位
```

## 与作业1规划的关系

Product.images按本次作业使用路径数组，后续上传接口把第一张映射为imageUrl；aiAnalysis补充待核实字段、审核状态和版本；MarketingAsset补充审核状态。当前health只检查API和数据库；Worker在后续作业加入后再扩展检查。

## Git与提交物

仓库：https://github.com/1352933271-spec/ai-marketing-workshop

忽略规则排除node_modules、dist、server/.env及上传文件，保留.env.example、前端公开配置和上传目录占位。

首次提交信息：`chore: init fullstack skeleton (vue3 + express + mongodb)`。

作业需要两张真实截图：①浏览器地址栏+Console成功响应；②首次提交信息、作者、时间，并在截图下方注明仓库地址。源码压缩包不替代这两张截图。

