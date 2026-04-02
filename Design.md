// TellTell游戏引擎设计！！

！此文档的帧指的是每次玩家的操作，如点击、加载存档、传送后，都会触发一次事件，检查一次当前树，取出最上层的节点进行判定

！采用纯事件驱动架构，以每个角色的视角构建所有的事件，最后由引擎进行统一调度

！故事采用第一人称叙事，所以每个节点都是以主角的主视角进行叙事。游戏定位为**强叙事性**，采用DAG（有向无环图）结构驱动，严格推演剧情走向。

1. 核心架构

-----
// 序列化接口：所有需要持久化状态的模块（各个系统、插件、CharacterManager、MapManager等）均需实现
ISerializable {
  save(): any; // 导出当前状态数据
  load(data: any): void; // 从存档数据恢复状态
}

- engine.ts

Engine加载所有StoryEventNode，仅通过读取各节点的 `postNodes` 构建引用图，并计算算出每个节点的初始入度（inDegree）。使用Kahn算法实现拓扑排序作为DAG推演的基础。
（引擎在调度节点时区分状态：不可见[入度>0] -> 锁定[入度=0但triggers不满足] -> 可执行[条件全满足]）
{
  node_map:  // 通过 ID 快速查找索引
  nodes: { node: StoryEventNode, inDegree: number }[]; // 剧情节点，当前inDegree为0即代表前置剧情全部走完
  instances: ISerializable[]; // 所有实例化的子系统与插件列表（用于统一调度存取）

  saveGame(): void; // 保存主线进度（已过的节点及当前入度），并遍历 instances 调用所有的 save() 取出各模块状态，组合成完整存档并写入 IndexedDB。
  loadGame(): void; // 加载剧情源文件，恢复当前的DAG入度和进度状态。随后遍历 instances 调用 load() 给各部分恢复状态数据。

  playNext(): void; // ★ 核心流程分发器。逻辑：1. 若无活跃节点则尝试激活触发；2. 若在节点内则推进下一帧；3. 若节点播完则根据 repeatable 判定是否步进 DAG。
}

-----
- event.ts

Event类定义：

StoryEventNode: // 剧情节点定义（剧情就是一组分镜的组合结果）*DAG图节点*
{
  id: NodeId; // 节点ID
  postNodes: NodeId[]; // 后置节点ID，用于给后续进度的产生有向边（引擎初始化时，会自动对postNodes内的节点增加 inDegree 入度）
  display: DisplayFrame[]; // 节点内的分镜内容（玩家通过点击来逐帧推进，播完所有的帧后该节点判定完成）
  repeatable?: boolean; // ★ 是否可重复触发。若为true，该节点完成后入度不归0且不记录到passedNodes，可被持续触发（如：回家睡觉、购买物品等功能性节点）
  triggers?: TriggerRequirement[]; // 节点额外触发条件
  priority?: number; // 节点优先级
  mount?: Action[]; // 节点挂载（初次切入第一帧前）执行的action
  unMount?: Action[]; // 节点卸载（最后一帧点击后）执行的action。若 !repeatable，则完成后会使其 postNodes 的入度 -1
}

NodeId: string; // 节点ID

TriggerRequirement: // 触发判定，引擎派发执行时采用try-catch容错，若目标模块/函数不存在则默认不阻断报错（返回false）。支持插件API调用。
{
  module: string; // 目标模块，如 'Character', 'Engine', 或是某个插件ID如 'mobile'
  func: string; // 函数名
  params: any[]; // 函数参数
}

DisplayFrame: // 分镜帧（玩家点击进入下一帧）
{
  screen?: ScreenState; // 场景背景
  dialog?: DialogState; // 对话
  choice?: Choice[]; // 选项
  transition?: string; // 过场动画/效果配置（如 'fade', 'flash'）
  pre?: Action[]; //进入当前帧前执行的action
  post?: Action[]; //当前分镜离开时执行的action
}

ScreenState: // 场景背景
{
  pic: string; // 图片ID，默认去 assets/screne/ 下加载webp
  text: string; // 场景中的悬浮文本
}

DialogState: // 对话
{
  char: string; // 角色ID，默认去 assets/character/ 下加载webp
  text: string; // 文本
}

Choice: // 选项
{
  text: string; // 选项文本
  requirement?: TriggerRequirement[]; // 选项触发条件，去requirement.ts中执行调用，返回true则视为满足条件（按钮变为可点击状态）
  target?: NodeId; // 若需要强行跳转剧情节点的时候，填入选项目标节点ID
}

Action: // 动作执行结构，支持异步(async/await)。采用try-catch灵活容错，若没有匹配的方法则静默不执行，避免阻断剧情流。
{
  module: string; // 目标执行模块，如 'Engine', 或是某个插件ID 'mobile'
  func: string; // 函数名
  params: any[]; // 函数参数
}

-----
- map.ts

Map类定义：
MapManager: // 地图管理器

MapId: string; // 地图ID
{
  maps: Map<MapId, Location>; // 地图
  
  switchMap: (mapId: MapId) => void; // 切换场景,
}

-----
- location.ts

Location类定义：// 场景地点类

LocationId: string; // 地点ID
{
  id: LocationId; // 地点ID
  name: string; // 地点名称
  postion: [number, number]; // 地点位置
  lock: boolean; // 是否锁定中，锁定的地点无法交互
  pinPic: string; // 作为pin显示的图片ID，默认去 assets/ui/pin/ 下加载webp
  mapPic: string; // 作为map显示的图片ID，默认去 assets/map/ 下加载webp
  mapSize: [number, number]; // 地图大小

  renderAsPin: () => Promise<void>; // 异步渲染为pin，点击pin的时候需要根据两个location之间的距离来增加时间，t=dis/speed

  renderAsMap: () => Promise<void>; // 异步渲染为map
}

-----
- character.ts

Character类定义：// 角色类

CharacterId: string; // 角色ID
{
  id: CharacterId; // 角色ID
  name: string; // 角色名称
  picMap: Map<string, string>; // 角色立绘ID -> 图片ID，默认去 assets/character/{CharacterId}/portrait/{picId}.webp 下加载webp，如aio/laugh
  audioMap: Map<string, string>; // 角色音频ID -> 音频ID，默认去 assets/character/{CharacterId}/audio/{audioId}.mp3 下加载mp3
  isProtagonist?: boolean; // 是否为主角，默认false
  favor: Map<CharacterId, number>; // 对CharacterId角色的好感度Map
  phoneNumber?: string; // 角色电话号码
  
  height: number; // 角色身高
  weight: number; // 角色体重
  age: number; // 角色年龄
  bloodType: string; // 角色血型
  birthDate: string; // 角色生日
  constellation: string; // 角色星座
  

  info: {
      text: string; // 信息文本
      lock: boolean; // 是否锁定，锁定不可见显示？？
      unlockRequirement: TriggerRequirement[]; // 解锁条件，去requirement.ts中执行调用，返回true则视为满足条件
  }[]
  load(): void; // 从json中加载角色信息
  renderPortrait(w: number, h: number, picId: string): Promise<void>; // 异步渲染角色立绘
  renderAvatar(w: number, h: number, picId: string): Promise<void>; // 异步渲染角色头像
  renderCharacterPanel(): Promise<void>; // 异步渲染角色面板
}

-----

DateTime.ts // 时间日期管理 (基于标准毫秒时间戳)
{
  currentTime: number; // 累计毫秒级时间戳 (Unix Timestamp)，存档核心值
  
  // 转换逻辑：基于 JavaScript 原生 Date API 对齐现实历法 (支持闰年、月份变动)
  START_TIME: "2024-01-01T08:00:00"; // 引擎默认起点

  // 方法
  addMinutes(n): Promise<void>; // 增加游戏时间（分钟），内部转换为毫秒
  nextDayAt(h, m): Promise<void>; // 跳转至明日指定时刻 (Hour, Minute)
  setAbsoluteTime(dateStr): Promise<void>; // 设置为绝对日期字符串 "2024-05-20T12:00:00"
  getDateTimeInfo(): DateTimeInfo; // 获取结构化日期 {year, month, day, hour, minute, timestamp}
  format(): string; // 返回格式化时间字符串 "2024/01/01 08:00"
}

DateTimeInfo // 结构化日期对象 (由 Date 对象解析)
{
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  timestamp: number; // 原始毫秒数
}

2. 插件系统

Plugin: // 插件定义。插件应当是剧情无关的独立系统（如手机系统）。
{
  id: string; // 插件ID，Action可以通过这个ID作为module来调用插件暴露的功能
  name: string; // 插件名称
  version: string; // 插件版本
  description: string; // 插件描述
  author: string; // 插件作者
  
  load: (data: any) => void; // 插件自行加载存档中的自身状态数据
  save: () => any; // 插件自行实现数据持久化逻辑，返回的独立数据由引擎统一归档
  render: () => Promise<void>; // 异步渲染插件内容

  // ---下面是具体实现

}



3. 剧情编辑UI

用于给编辑编辑剧情的界面，要求如下：

可拖拽节点，节点之间用线连接，形成DAG图，节点可以双击编辑，编辑完成后保存为json文件

左侧可以切换所有角色，点击角色后左侧显示二级菜单，显示角色的所有事件，点击事件可以进行编辑（右侧菜单），中间的空间渲染整个剧情的DAG图，当出现环的时候，用红色线条标记

