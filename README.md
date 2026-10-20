# AI 出海营销工坊

刘嘉略 · 0120251050  
作业3：在Vue 3 + Express + MongoDB工程骨架上实现商品资产中心。

## 本次实现

- Vue 3 / Vite前端，Element Plus、Pinia、Vue Router、Axios；ECharts已安装，图表在后续作业实现。
- 页面自动请求真实的`GET /api/health`，展示成功或失败；控制台打印对象和完整JSON。
- Express路由、控制器、服务、配置、模型和中间件分层；CORS、JSON/表单解析、404与统一错误信封。
- Mongoose Product、MarketingAsset模型，时间戳、必填及枚举约束、商品引用索引。
- 数据库断开时健康接口返回503，而非伪报成功；启动必须先连接MongoDB。
- 首页为资产中心：拖拽多图上传、名称/受众/品类表单、分页瀑布流、全部图片预览；原健康检测页移至`/health`。
- 新增multer磁盘暂存、Sharp真实图片解码与再编码、失败清理；AI调用、文案、生图、看板和ZIP业务在后续作业实现。

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

打开 http://localhost:5174 使用资产中心；打开 http://localhost:5174/health ，按F12选择Console查看`[health] 后端响应`；直接访问 http://localhost:3100/api/health 也可查看JSON：

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

作业2的两张联调/首次提交截图已单独交付；作业3需要两张交互截图：①表单已填写、已选择两张图片；②提交成功后出现商品卡片。源码压缩包不替代截图。

## 作业3：接口与上传约定

| 接口 | 请求 | 成功响应data |
|---|---|---|
| POST `/api/products` | multipart/form-data：name必填文本≤100字符；audience可选文本≤200字符；category可选文本≤60字符；images必填文件数组1～5张 | Product文档，含_id、name、audience、category、images:string[]、createdAt、updatedAt；HTTP201 |
| GET `/api/products` | page正整数默认1、size正整数默认20且≤50；按创建时间和_id倒序 | {list:Product[],total:number,page:number,size:number} |
| GET `/uploads/:filename` | 服务端生成的UUID文件名 | 图片二进制；不存在返回404 |

所有JSON响应沿用`{code,message,data}`，失败data为null。校验失败HTTP400：4001表单/数量/分页错误、4002图片格式或解码错误、4003单图过大；服务器异常500/5001。列表空页保留真实total。

与作业1的接口草案差异：本次按作业3明确要求改为`images`多图字段、单张5MB（原草案单图10MB），列表使用`size`和`list`（原草案pageSize和items）；前后端已统一，后续作业沿用此实现。

文件只允许JPEG/PNG/WebP；不信任原始文件名、扩展名和MIME，Sharp必须实际解码且格式匹配，拒绝多帧及超过2500万像素图片。上传先落入不公开的`.staging`目录，重新编码后以UUID及真实格式后缀保存到uploads。原始元信息和附加数据不会保留；任何校验/数据库写入失败会清理本次文件。

静态目录只对UUID图片文件名开放，设置nosniff，禁止目录列表及暂存文件访问。上传图片不进Git；换电脑或重新克隆后，已有数据库记录对应的图片也需要另行迁移。

## 作业3：自动集成验证

确保MongoDB已启动并配置server/.env后，在根目录运行：

```powershell
npm --prefix server test
```

使用随机命名的独立临时数据库，不操作aimarketing业务库；测试结束自动清理本次生成图片与测试数据库。覆盖多图写入/读取、静态访问、伪装/损坏文件、超大小和数量、边界值、分页、暂存目录隔离、数据库失败清理。

实现参考：[Multer官方文档](https://expressjs.com/en/resources/middleware/multer/)、[Sharp构造与解码选项](https://sharp.pixelplumbing.com/api-constructor/)。

