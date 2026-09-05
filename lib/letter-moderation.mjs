const compact = (value) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s._*·•|/\\-]+/g, "");

export const MODERATION_KEYWORDS = Object.freeze({
  self_harm: [
    "自杀", "自尽", "轻生", "自残", "割腕", "跳楼", "跳桥", "上吊", "吞药",
    "烧炭", "不想活了", "活不下去", "结束生命", "结束自己的生命", "离开这个世界",
    "永远消失", "了结自己", "寻死", "赴死", "自我伤害", "伤害自己",
  ],
  violence_threat: [
    "杀了你", "杀死你", "砍死你", "捅死你", "弄死你", "打死你", "灭门", "报复你",
    "绑架", "投毒", "下毒", "买凶", "放火烧", "制造炸弹", "爆炸物", "枪支弹药",
    "人肉搜索", "人肉你", "开盒你", "曝光住址", "寄刀片", "血洗", "屠杀",
  ],
  minor_safety: [
    "儿童色情", "儿童裸照", "未成年裸照", "未成年色情", "幼童色情", "幼女色情",
    "猥亵儿童", "性侵儿童", "诱骗未成年", "未成年约炮", "恋童", "炼铜", "幼女资源",
    "小学生裸照", "初中生裸照", "未成年私密照", "儿童性交易",
  ],
  sexual_content: [
    "约炮", "裸聊", "色情服务", "成人视频", "成人网站", "性爱视频", "裸照交换",
    "私密视频", "援交", "招嫖", "卖淫", "嫖娼", "性交易", "强奸", "迷奸",
    "偷拍视频", "偷拍视频交易", "不雅照", "成人视频资源", "成人视频链接",
  ],
  hate_harassment: [
    "去死吧", "全家死", "死全家", "废物东西", "人渣东西", "贱人", "畜生东西",
    "垃圾人", "恶心死了", "滚出这里", "网络暴力", "集体网暴", "挂人", "曝光隐私",
    "骚扰电话", "短信轰炸", "诅咒你", "不得好死", "全家不得好死",
  ],
  illegal_trade: [
    "出售毒品", "购买毒品", "冰毒", "海洛因", "芬太尼", "摇头丸", "致幻剂交易",
    "大麻交易", "卖枪", "买枪", "枪支交易", "代开发票", "洗钱", "跑分", "套现",
    "赌博平台", "博彩平台", "线上博彩", "下注平台", "裸贷", "非法集资", "假证办理",
    "出售银行卡", "收购银行卡", "出售身份证", "收购身份证",
  ],
  scam_spam: [
    "刷单返利", "兼职刷单", "点赞返现", "日赚千元", "月入十万", "稳赚不赔",
    "保本收益", "内部消息", "内幕消息", "带单老师", "投资群", "荐股群", "免费荐股",
    "扫码领取", "点击链接领取", "免费领取红包", "无抵押贷款", "快速放款", "低息贷款",
    "充值返利", "虚拟币稳赚", "资金盘", "杀猪盘", "博彩送彩金", "中奖通知",
    "账号解封", "代办信用卡", "出售账号", "低价代充", "游戏外挂", "引流推广",
  ],
  extremist_content: [
    "恐怖组织招募", "极端组织招募", "圣战招募", "制造恐袭", "策划恐袭", "袭击计划",
    "爆炸教程", "制毒教程", "枪械制作教程", "煽动暴乱", "宣扬恐怖主义",
  ],
  privacy_doxxing: [
    "真实姓名是", "身份证号码", "身份证号", "家庭住址", "详细住址", "学校地址",
    "公司地址", "门牌号码", "手机号是", "电话号码是", "邮箱地址是", "微信号是",
    "qq号是", "定位地址", "快递地址", "户籍地址",
  ],
});

const CATEGORY_WEIGHTS = Object.freeze({
  self_harm: 82,
  violence_threat: 78,
  minor_safety: 100,
  sexual_content: 68,
  hate_harassment: 58,
  illegal_trade: 76,
  scam_spam: 62,
  extremist_content: 95,
  privacy_doxxing: 72,
});

const CONTACT_PATTERNS = Object.freeze([
  { type: "phone", pattern: /(?:^|\D)1[3-9](?:[\s-]?\d){9}(?:\D|$)/i },
  { type: "email", pattern: /[\w.+-]+\s*@\s*[\w.-]+\s*\.\s*[a-z]{2,}/i },
  { type: "url", pattern: /(?:https?:\/\/|www\.)[^\s]+/i },
  { type: "domain", pattern: /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/(?:[^\s]*)?/i },
  { type: "wechat", pattern: /(?:微信|微 信|wechat|vx)\s*(?:号|id)?\s*[:：]?\s*[a-z][a-z0-9_-]{5,19}/i },
  { type: "qq", pattern: /(?:qq|扣扣|企鹅)\s*(?:号)?\s*[:：]?\s*[1-9]\d{4,11}/i },
  { type: "telegram", pattern: /(?:telegram|电报|tg)\s*[:：@]?\s*[a-z0-9_]{5,}/i },
  { type: "discord", pattern: /discord\s*[:：#]?\s*[a-z0-9_.-]{3,}/i },
  { type: "id_card", pattern: /(?:^|\D)\d{17}[\dXx](?:\D|$)/ },
]);

export function moderateLetter(input) {
  const source = typeof input === "string" ? input : "";
  const normalized = compact(source);
  const flags = [];
  const matches = {};
  let riskScore = 0;

  for (const [category, words] of Object.entries(MODERATION_KEYWORDS)) {
    const hits = words.filter((word) => normalized.includes(compact(word)));
    if (!hits.length) continue;
    flags.push(category);
    matches[category] = [...new Set(hits)];
    const weight = CATEGORY_WEIGHTS[category] ?? 40;
    riskScore += weight + Math.min((hits.length - 1) * 4, 12);
  }

  const contactTypes = CONTACT_PATTERNS.filter(({ pattern }) => pattern.test(source)).map(({ type }) => type);
  if (contactTypes.length) {
    flags.push("personal_information");
    matches.personal_information = contactTypes;
    riskScore = 100;
  }

  return {
    riskScore: Math.min(riskScore, 100),
    flags: [...new Set(flags)],
    matches,
    hardBlock: contactTypes.length > 0,
  };
}
