# AI 出海营销工坊

刘嘉略 · 0120251050  
作业4：在商品资产中心上接入百炼多模态识图，输出结构化分析并保存到MongoDB。

## 本次实现

- Vue 3 / Vite前端，Element Plus、Pinia、Vue Router、Axios；ECharts已安装，图表在后续作业实现。
- 页面自动请求真实的`GET /api/health`，展示成功或失败；控制台打印对象和完整JSON。
- Express路由、控制器、服务、配置、模型和中间件分层；CORS、JSON/表单解析、404与统一错误信封。
- Mongoose Product、MarketingAsset模型，时间戳、必填及枚举约束、商品引用索引。
- 数据库断开时健康接口返回503，而非伪报成功；启动必须先连接MongoDB。
- 首页为资产中心：拖拽多图上传、名称/受众/品类表单、分页瀑布流、全部图片预览；原健康检测页移至`/health`。
- multer磁盘暂存、Sharp真实图片解码与再编码、失败清理。
- 统一llmClient、前三张图Base64、严格JSON校验与一次格式重试、识图接口、卡片loading与三色标签。文案、生图、看板和ZIP业务在后续作业实现。

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

## 作业4：真实多模态识图

在`server/.env`设置`DASHSCOPE_API_KEY`、`LLM_BASE_URL`、`VISION_MODEL=qwen3-vl-plus`；`TEXT_MODEL=qwen-plus`预留给后续文案作业。本次使用控制台实际可选的Qwen3-VL-Plus，保留课程要求的兼容协议与三个输出字段。Base URL应复制自己百炼工作空间提供的地址，不同地域的Key、模型与地址需要匹配。

复制`.env.example`后填自己的Key，不要覆盖已有配置。Key只放后端环境变量，不进入前端、Git、报告或ZIP。建议先在百炼为所选视觉模型开启免费额度“用完即停”；这是账户侧设置，克隆项目不会自动继承。

`POST /api/products/:id/analyze`无请求体：读取MongoDB商品和最多前三张本地图片，经Sharp缩放至1280像素以内、转JPEG Base64后调用模型。成功HTTP200、`{code:0,message:"ok",data:{visual_elements,core_selling_points,scene_suggestions,analyzedAt,reviewStatus,version}}`；前三项为字符串数组。外观3～6条、卖点3～5条、场景3条，每条1～30字符；不可识别商品时三个数组全空。附加的审核状态/时间/版本由后端生成；`uncertain_fields`为既有模型预留字段，当前不会推断其内容。

错误：HTTP400/4001无效ID、无图或图片不可读；404/4004商品不存在；409/4009同商品正在识别；503/5002缺少配置；502/5002上游调用、超时或格式异常。失败data为null。仅JSON解析或结构失败重试一次，鉴权/额度/网络失败不自动重试；失败保留已保存结果。单次模型45秒、识图总体85秒、前端110秒超时。

前端按商品独立loading并禁用按钮，失败提示、识别完成直接更新当前卡片、刷新后读取已保存结果。分析以草稿展示，蓝色外观/绿色卖点/橙色场景；空结果提示换图。

2026-10-20真实调用通过；8项视觉单元测试和原上传回归合计24个测试全部通过，Vue生产构建通过。真实浏览器核对按钮防重、并发409、三类标签、刷新后持久化、错误提示及390px布局。端口3200/5274为本机隔离验收使用，示例默认仍为3100/5174。

调优报告及原始证据见[作业4进度与联调](docs/作业4进度与联调.md)与`docs/验收记录/`。调优采用示例商品插画，不是实物检测；结构正确不等于事实已验证，卖点使用前须人工核对。

可选复现实测：先上传同名示例商品，配置Key与免费额度保护，再运行`node server/scripts/tune-vision.js`。该命令会真实调用模型并更新实测记录，消耗所选模型额度。普通`npm --prefix server test`使用注入响应验证视觉逻辑，不调用模型。

来源：[阿里云获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)、[图像与视频理解](https://help.aliyun.com/zh/model-studio/vision-model)。

