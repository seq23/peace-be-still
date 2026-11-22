// Chinese pages (Simplified) for Mandarin-speaking Christians in the US, centred on the night: bedtime
// prayer, sleepless nights, evening and morning prayer (owner's approved plan, 21 Nov 2026: Phase 0, seven
// web pages, nothing in the app or the store). Rules for every page here:
// - written in Chinese as a mainland-born churchgoer would say it, not translated from English; Protestant
//   words (祷告, 神, 弟兄姊妹), never 祈祷 or 天主;
// - scripture is the 1919 和合本 (神 edition), Simplified, word for word, through scripture.mjs with lang
//   "zh-Hans". Never the 1988 新标点和合本 or the 和合本修订版, never a paraphrase; every page carries the
//   credit line in its sources. Our prayers are ours and are never set as verses;
// - only what the app does today: the app is in English and Spanish; no Chinese app screens are promised
//   and no date is given;
// - no health promise: prayer is not a treatment for insomnia; long sleeplessness goes to a doctor, and
//   thoughts of self-harm to 988 (Mandarin interpreter by phone);
// - no waitlist (closed 18 Nov 2026): the store CTA, and Instagram for news;
// - no denomination taken, and nothing about politics or places: Simplified is a reading choice only.
import { V } from "./scripture.mjs";
import { facts } from "./parts.mjs";

const F = facts();
const D = { published: "2026-11-22", updated: "2026-11-22", publishedText: "2026年11月22日", updatedText: "2026年11月22日" };
const G = "睡前祷告";
const IG = `<a href="https://www.instagram.com/peacebestillapp/">Instagram @peacebestillapp</a>`;
const LANDING = "/zh/";
const ZQ = {
  bedtime: "/zh/questions/bedtime-prayer/",
  verses: "/zh/questions/bible-verses-for-sleepless-nights/",
  evening: "/zh/questions/evening-prayer/",
  morning: "/zh/questions/morning-prayer-bible-verses/",
  app: "/zh/questions/bible-app-without-ads/",
  insomnia: "/zh/questions/prayer-when-you-cannot-sleep/",
};
const ALL_Q = Object.values(ZQ);
export const CUV_CREDIT = "和合本（1919年版，公有领域）";
const CUV_SRC = [`经文：${CUV_CREDIT}，维基文库《圣经（和合本）》，按1919年版用字`, "https://zh.wikisource.org/wiki/%E8%81%96%E7%B6%93_(%E5%92%8C%E5%90%88%E6%9C%AC)"];
const CUV_SRC2 = ["对照本：信望爱圣经网《官话和合本》（1919年）", "https://bible.fhl.net/"];
const LIFELINE_SRC = ["988 生命专线：讲中文者的口译服务", "https://988lifeline.org/interpretation-services/chinese-simplified/"];
const BASE_ZH = { ...D, lang: "zh-Hans", door: "faith", group: G, sources: [CUV_SRC, CUV_SRC2] };

// What the app does today, said the same way on every Chinese page.
const TODAY_TABLE = `<table class="t"><thead><tr><th>功能</th><th>现在的情况</th></tr></thead><tbody>
<tr><td>读经</td><td>英文钦定本（KJV）全本圣经，免费</td></tr>
<tr><td>听经</td><td>KJV 朗读，章数还在陆续增加</td></tr>
<tr><td>Psalm Nights</td><td>睡前轻声读一篇诗篇，屏幕保持暗色（英文，AI 语音）</td></tr>
<tr><td>Morning Word</td><td>每天早上一节经文和一段宣告（英文）</td></tr>
<tr><td>圣经聊天</td><td>随应用上架一起推出（AI 聊天，英文）</td></tr>
<tr><td>每日圣经故事</td><td>每天一篇（英文）</td></tr>
<tr><td>中文界面和中文经文</td><td>还没有</td></tr>
</tbody></table>`;

const ABOUT_CUV = `<p>本页的经文用的是1919年出版的和合本（神版），一字不改，由繁体原文转成简体。这个版本出版已经一百多年，在美国早已是公有领域。现在很多教会读的《新标点和合本》（1988年）和《和合本修订版》由香港圣经公会管理版权，所以我们没有用。1919年版的标点比较简单，句中多用顿号，看起来会有点旧，字句和你手上的和合本几乎一样，可以对照着读。</p>`;

const WHY_NAME = `<p>Peace Be Still 这个名字出自马可福音第四章。门徒在海上遇到暴风，主耶稣醒来，对风和海说话：</p>
${V("MAR 4:39", "zh-Hans")}
<p>英文钦定本把这句话译作 “Peace, be still”。夜里心里翻腾、睡不着的时候，我们希望这句话也能陪着你。</p>`;

const SLEEP_NOTE = `<p>祷告不能代替医生。如果失眠已经持续好几个星期，或者影响到白天的工作和生活，请去看家庭医生。如果你有伤害自己的念头，请马上拨打 988。接通后说 “Mandarin” 或 “Chinese”，就会为你接上中文口译，全天都有（只限电话）。</p>`;

const prayer = (body) => `<p>“${body}奉主耶稣基督的名祷告，阿们。”</p>`;

export const ZH = [
  {
    ...BASE_ZH, path: LANDING,
    alts: [["zh-Hans", LANDING], ["en", "/"], ["es", "/es/"], ["ko", "/ko/"]], xDefault: "/",
    og: "og-zh.png", ogAlt: "Peace Be Still 标志，旁边写着“夜里睡不着的时候，有一节经文陪你”",
    audience: "Mandarin-speaking Christians in the United States",
    title: "睡前祷告和经文：夜里睡不着的时候 · Peace Be Still 中文介绍",
    ogTitle: "夜里睡不着的时候，有一节经文陪你 · Peace Be Still",
    description: "写给在美国的华人基督徒：睡前怎样祷告，睡不着的时候读哪些经文，以及 Peace Be Still 这个应用现在能做什么、还不能做什么。经文用1919年和合本。",
    h1: "夜里睡不着的时候，有一节经文陪你",
    indexLabel: "睡前祷告和 Peace Be Still",
    definition: "Peace Be Still 是一个帮你用神的话开始和结束一天的手机应用。应用现在是英文和西班牙文的，还没有中文界面。这几页中文是写给在美国的华人弟兄姊妹的：睡前怎样祷告，睡不着的时候读哪些经文。经文都用1919年的和合本，一字不改。",
    quick: "应用里现在有的是英文钦定本（KJV）读经和听经、睡前轻声读诗篇（Psalm Nights）、每天早上的一节经文。都是英文。AI 圣经聊天随应用上架一起推出。中文界面和中文经文还没有。睡前祷告的方法和经文，这几页中文现在就可以用。",
    bestFor: "晚上躺下脑子停不下来的人，下班很晚、只剩睡前一点安静时间的人，还有想和英文更好的孩子一起睡前祷告的爸爸妈妈",
    sections: [
      ["在美国，一天最安静的时候常常是睡前", `<p>白天要上班、接送孩子、处理各种账单和邮件，周三的查经和周五的团契也不一定赶得上。很多弟兄姊妹真正能安静下来的，是关灯以后那十几分钟。可那时候心里最容易翻腾：工作、身份、老人的身体、孩子的学校，一件件冒出来。</p>
<p>Peace Be Still 不是要代替你的教会和小组。它是放在床头的一个小工具，让你在睡前把心思交给神，用一节经文结束这一天。</p>
${V("PSA 4:8", "zh-Hans")}`],
      ["Peace Be Still 现在能做什么", `<p>应用还没有在 App Store 上架。上架以后，可以用的是下面这些：</p>
${TODAY_TABLE}
<p>免费的部分会一直免费。付费是每月 ${F.monthly} 或每年 ${F.yearly}。没有广告，也没有到期自动扣费的免费试用。</p>`],
      ["为什么叫 Peace Be Still", WHY_NAME],
      ["这里的经文是哪个译本？", ABOUT_CUV],
      ["今晚就可以开始的睡前祷告", `<ol>
<li><strong>放下手机。</strong>只留一节经文在屏幕上，或者干脆把手机放远一点。</li>
<li><strong>读一节经文。</strong>慢慢读两遍，可以小声读出来。</li>
<li><strong>感恩。</strong>想三件今天要感谢神的事，再小的事也可以。</li>
<li><strong>交托。</strong>把放不下的事一件一件告诉神，说完就交给他。</li>
<li><strong>安静。</strong>不用再说什么，在主面前静静地躺着。</li>
</ol>
<p>详细的做法和几段祷告词，在<a href="${ZQ.bedtime}">睡前祷告怎么做</a>这一页。</p>`],
    ],
    faq: [
      ["Peace Be Still 有中文版吗？", "应用还没有。现在应用的界面和朗读是英文和西班牙文，随上架推出的聊天也是。这个网站上的中文页面现在就可以看。如果以后有中文的内容，我们会先在这里和 Instagram 上说。"],
      ["是免费的吗？", `是的，免费的部分会一直免费：KJV 全本圣经的阅读和朗读、每日圣经故事、每天一次聊天（最多 ${F.free} 条消息，随应用上架推出）、第一晚的诗篇和以后每周一次，还有每天早上的宣告。付费是每月 ${F.monthly} 或每年 ${F.yearly}。`],
      ["这是哪个宗派的应用？", "不属于任何宗派。不管你在浸信会、长老会、宣道会、播道会，还是独立的华人教会，都可以用。我们把圣经经文放在中心。信仰上个人的问题，建议和你教会的牧师、长老或小组长谈。"],
      ["AI 聊天会代替牧师吗？", "不会。圣经聊天是随应用上架推出的 AI 聊天，不是真人牧者，每个回答都会说明这一点。信仰上的个人问题，请和你教会的牧者谈。"],
      ["什么时候在 App Store 上架？", "快了。上架以后，页面下方的按钮会直接连到 App Store。"],
    ],
    relatedTitle: "关于睡前祷告的文章",
    related: ALL_Q,
    sources: [CUV_SRC, CUV_SRC2, LIFELINE_SRC],
  },
  {
    ...BASE_ZH, path: ZQ.bedtime,
    title: "睡前祷告怎么做：五个步骤和三段祷告词 · Peace Be Still",
    description: "睡前祷告不用很长。感恩、认罪、交托、为家人代祷、安静，十分钟就够。这里有五个步骤，三段可以照着念的睡前祷告词，还有几节睡前读的经文。",
    h1: "睡前祷告怎么做：五个步骤，十分钟就够",
    indexLabel: "睡前祷告怎么做",
    definition: "睡前祷告就是在一天结束、躺下以前，把这一天和明天交给神。它不需要很长，也不需要漂亮的话。感恩、认罪、交托、为家人代祷，最后在主面前安静一会儿，十分钟就够了。",
    quick: "关灯前先读一节经文，然后按顺序祷告：为今天感恩，承认今天的软弱，把放不下的事交给神，为家人代祷，最后安静。想不出话的时候，可以照着下面的祷告词念。",
    bestFor: "想养成睡前祷告习惯、又不知道从哪里开始的人",
    sections: [
      ["五个步骤", `<table class="t"><thead><tr><th>步骤</th><th>时间</th><th>怎么做</th></tr></thead><tbody>
<tr><td>读经</td><td>2分钟</td><td>读一节经文，慢慢读两遍。</td></tr>
<tr><td>感恩</td><td>2分钟</td><td>说出今天三件要感谢的事。</td></tr>
<tr><td>认罪</td><td>2分钟</td><td>今天说错的话、做错的事，诚实地告诉神。</td></tr>
<tr><td>交托和代祷</td><td>3分钟</td><td>把明天的事和放不下的人一个一个交给神。</td></tr>
<tr><td>安静</td><td>1分钟</td><td>不再说话，安静躺着，把心交给神。</td></tr>
</tbody></table>
${V("PSA 4:8", "zh-Hans")}`],
      ["睡前祷告词一：结束忙碌的一天", `${prayer("亲爱的天父，感谢你今天一路保守我。工作上的事、路上的平安、家里的饭菜，都是你的恩典。今天我有说错的话、急躁的时候，求你赦免我。明天的事我现在交在你手里，求你赐我安稳的睡眠。")}`],
      ["睡前祷告词二：心里放不下的时候", `${prayer("主啊，我躺下了，心里却还是放不下。这些担心我自己解决不了，现在一件一件交给你。求你让我的心安静下来，像你对风和海说话那样，也对我的心说：静了罢。")}
${V("1PE 5:7", "zh-Hans")}`],
      ["睡前祷告词三：为家人", `${prayer("天父，我把家里每一个人带到你面前。求你看顾远方的父母，保守他们的身体；看顾孩子，让他们在学校里有好朋友，也认识你；也看顾我和我的配偶，让我们彼此体谅。今夜求你让全家都平安睡觉。")}`],
      ["和孩子一起睡前祷告", `<p>孩子小的时候，三分钟就够：读一节短经文，每个人说一件今天感谢的事，爸爸或妈妈做一个简短的祷告。如果孩子英文比中文好，可以让孩子读英文经文，大人读中文，同一节经文各读一遍。</p>
${V("PSA 3:5", "zh-Hans")}
<div lang="en">${V("PSA 3:5", "en")}</div>`],
    ],
    faq: [
      ["睡前祷告一定要跪着吗？", "不一定。跪着、坐着、躺着都可以。神看的是心。很多人是躺下以后才开始祷告的，这也没有问题。"],
      ["祷告到一半睡着了怎么办？", "不用自责。像孩子在父亲怀里睡着一样，在祷告中睡着，正好说明你把这一天放下了。"],
      ["每天都要照着这些祷告词念吗？", "不需要。这些祷告词只是起个头。用你自己的话跟神说，才是最好的祷告。"],
    ],
    related: [LANDING, ZQ.evening, ZQ.verses, ZQ.insomnia],
  },
  {
    ...BASE_ZH, path: ZQ.verses,
    title: "失眠时读的圣经经文12节（和合本） · Peace Be Still",
    description: "睡不着的时候可以读的12节圣经经文，附章节，用1919年和合本原文。分成躺下的平安、把重担交给神、夜里的倚靠、早晨的盼望四组。",
    h1: "睡不着的时候读的12节经文",
    indexLabel: "失眠时读的经文",
    definition: "失眠的时候，很多基督徒会读讲平安、安息和倚靠神的经文，例如诗篇4篇8节、诗篇127篇2节、箴言3章24节和马太福音11章28节。下面12节经文用的是1919年和合本，一字不改。",
    quick: "躺下前读诗篇4:8或箴言3:24；心里有重担时读马太福音11:28或彼得前书5:7；半夜醒来时读诗篇121:3-4；天亮前读耶利米哀歌3:22-23。一次读一节就够，不用读很多。",
    bestFor: "夜里睡不着、半夜醒来、心里烦乱的时候，想找一节经文来默想的人",
    sections: [
      ["这里的经文是哪个译本？", ABOUT_CUV],
      ["躺下的平安", `${V("PSA 4:8", "zh-Hans")}
${V("PSA 127:2", "zh-Hans")}
${V("PRO 3:24", "zh-Hans")}`],
      ["把重担交给神", `${V("MAT 11:28", "zh-Hans")}
${V("1PE 5:7", "zh-Hans")}
${V("PHI 4:6-7", "zh-Hans")}`],
      ["夜里的倚靠", `${V("PSA 121:3-4", "zh-Hans")}
${V("PSA 63:5-6", "zh-Hans")}
${V("ISA 26:3", "zh-Hans")}`],
      ["早晨的盼望", `${V("PSA 30:5", "zh-Hans")}
${V("LAM 3:22-23", "zh-Hans")}
${V("JOH 14:27", "zh-Hans")}`],
      ["怎样用经文默想", `<p>选一节经文，慢慢读几遍，每次停在一个词上。比如诗篇4篇8节，先停在“躺下”，再停在“安然”，最后停在“独有你”。然后用这节经文向神祷告：“主啊，我现在躺下，求你让我安然睡觉。”不是要背下来，只是让这句话陪你入睡。</p>
${SLEEP_NOTE}`],
    ],
    faq: [
      ["读经文就能治好失眠吗？", "不能这样说。经文能让心安静下来，但它不是治疗。如果失眠持续好几个星期，请去看医生。"],
      ["一个晚上要读多少节？", "一节就够。睡前读太多，脑子反而更清醒。选一节，反复默想。"],
      ["1919年和合本和我手上的圣经一样吗？", "字句几乎一样，主要是标点和少数用字不同。1919年版句中多用顿号，现在的新标点和合本改用了逗号和分号。"],
    ],
    related: [LANDING, ZQ.insomnia, ZQ.bedtime, ZQ.morning],
    sources: [CUV_SRC, CUV_SRC2, LIFELINE_SRC],
  },
  {
    ...BASE_ZH, path: ZQ.evening,
    title: "晚祷词：一天结束时的祷告，和晚祷的顺序 · Peace Be Still",
    description: "晚祷是一天结束时的祷告。这里有晚祷的四个部分（回顾、感恩、认罪、交托），两段晚祷词，以及适合晚上读的经文，可以一个人用，也可以全家一起用。",
    h1: "晚祷词：一天结束的时候，怎样向神祷告",
    indexLabel: "晚祷词和晚祷的顺序",
    definition: "晚祷就是在一天结束时的祷告：回顾这一天，为恩典感恩，承认软弱，把夜晚和明天交给神。它可以在晚饭后全家一起做，也可以在睡前一个人做，长短都可以。",
    quick: "晚祷分四步：回顾今天，感恩，认罪，交托。全家一起时，每人说一句感恩，最后由一个人做总结的祷告。一个人的时候，可以读一节经文，再用下面的晚祷词。",
    bestFor: "想在晚饭后带全家祷告的父母，和想给一天好好收尾的人",
    sections: [
      ["晚祷的四个部分", `<ol>
<li><strong>回顾。</strong>想一想今天从早到晚经历了什么。</li>
<li><strong>感恩。</strong>为今天看得见、看不见的保守感谢神。</li>
<li><strong>认罪。</strong>今天亏欠神、亏欠人的地方，诚实地说出来。</li>
<li><strong>交托。</strong>把今夜的睡眠和明天的事交给神。</li>
</ol>
${V("PSA 42:8", "zh-Hans")}`],
      ["晚祷词：一个人的时候", prayer("天父，这一天就要过去了。谢谢你让我平安回到家。今天我有忙乱的时候，也有忘记你的时候，求你赦免我。今夜我把自己交在你手中，你是不打盹也不睡觉的神，我可以放心地睡。")],
      ["晚祷词：全家一起的时候", `${prayer("主啊，谢谢你今天把我们一家人又带到一起。谢谢你给我们饭吃，给我们工作和学校。求你赦免我们今天对彼此说的重话，让我们睡前彼此原谅。求你保守远方的家人，也保守我们今夜平安。")}
<p>全家一起的时候，可以先让每个人说一件今天感谢的事，孩子也可以用英文说。最后由爸爸或妈妈做这段总结的祷告。</p>`],
      ["晚上读的经文", `${V("PSA 121:3-4", "zh-Hans")}
${V("PSA 91:1", "zh-Hans")}`],
      ["Peace Be Still 能做什么", `<p>应用现在是英文的。上架以后，晚上可以用 Psalm Nights 听一篇轻声朗读的诗篇（英文，AI 语音），屏幕保持暗色。中文的内容还没有。<a href="${LANDING}">了解更多</a></p>`],
    ],
    faq: [
      ["晚祷和睡前祷告有什么不同？", "其实很接近。晚祷常常在晚饭后、全家一起做，内容更完整；睡前祷告常常是一个人躺下前做，更简短。两样都做也很好。"],
      ["晚祷要多长时间？", "五分钟到二十分钟都可以。全家一起的时候，孩子小就短一点，重要的是每天都有。"],
      ["不会祷告的家人也可以参加吗？", "可以。请他们说一句感谢的话就好，不用勉强他们开口祷告。"],
    ],
    related: [LANDING, ZQ.bedtime, ZQ.morning, ZQ.verses],
  },
  {
    ...BASE_ZH, path: ZQ.morning,
    title: "晨祷经文12节：用神的话开始一天（和合本） · Peace Be Still",
    description: "早晨灵修和晨祷可以读的12节经文，附章节，用1919年和合本原文。还有一个十分钟的晨祷顺序，适合上班前的早晨。",
    h1: "晨祷经文：用神的话开始一天",
    indexLabel: "晨祷经文",
    definition: "晨祷就是在一天开始时的祷告。很多人会读讲早晨、寻求和更新的经文，例如诗篇5篇3节、诗篇143篇8节、马可福音1章35节和耶利米哀歌3章22到23节。下面的经文用1919年和合本，一字不改。",
    quick: "起床后先读一节经文，再用十分钟祷告：感恩，把今天的安排交给神，为要见的人代祷。时间紧的早晨，读诗篇5:3，说一句交托的祷告也可以。",
    bestFor: "想在上班前有一段灵修时间的人，想重新开始晨祷习惯的人",
    sections: [
      ["这里的经文是哪个译本？", ABOUT_CUV],
      ["早晨的祷告", `${V("PSA 5:3", "zh-Hans")}
${V("PSA 143:8", "zh-Hans")}
${V("MAR 1:35", "zh-Hans")}`],
      ["每天早晨的恩典", `${V("LAM 3:22-23", "zh-Hans")}
${V("PSA 90:14", "zh-Hans")}
${V("PSA 30:5", "zh-Hans")}`],
      ["新的力量", `${V("ISA 40:31", "zh-Hans")}
${V("PSA 46:10", "zh-Hans")}
${V("PSA 118:24", "zh-Hans")}`],
      ["引导这一天", `${V("PRO 3:5-6", "zh-Hans")}
${V("PSA 119:105", "zh-Hans")}
${V("MAT 6:34", "zh-Hans")}`],
      ["十分钟晨祷", `<table class="t"><thead><tr><th>顺序</th><th>时间</th><th>怎么做</th></tr></thead><tbody>
<tr><td>读经</td><td>3分钟</td><td>读一节或一小段，慢慢读两遍。</td></tr>
<tr><td>感恩</td><td>2分钟</td><td>为昨夜的睡眠和新的一天感谢神。</td></tr>
<tr><td>交托</td><td>3分钟</td><td>把今天的工作、会议和路程交给神。</td></tr>
<tr><td>代祷</td><td>2分钟</td><td>为今天要见的人和家人祷告。</td></tr>
</tbody></table>
<p>Peace Be Still 的 Morning Word 每天早上给你一节经文和一段宣告，现在是英文的。<a href="${LANDING}">了解更多</a></p>`],
    ],
    faq: [
      ["晨祷一定要很早起来吗？", "不一定。晨祷的意思是把一天的第一段时间给神。上夜班的人，醒来后的第一段时间就是你的早晨。"],
      ["早上时间很紧怎么办？", "读一节经文，说一句交托的祷告，一分钟也可以。可以在前一天晚上先选好第二天要读的经文。"],
      ["晨祷和灵修是一回事吗？", "很接近。灵修通常更长，会读一段经文、默想、记笔记；晨祷更侧重祷告。可以合在一起做。"],
    ],
    related: [LANDING, ZQ.evening, ZQ.bedtime, ZQ.app],
  },
  {
    ...BASE_ZH, path: ZQ.app,
    title: "没有广告的圣经应用怎么选：先看这四点 · Peace Be Still",
    description: "选圣经应用时先看四点：用的是哪个译本、有没有得到许可；读经和祷告时会不会跳出广告；免费试用到期会不会自动扣费；晚上用起来方不方便。",
    h1: "没有广告的圣经应用，怎么选？",
    indexLabel: "怎样选没有广告的圣经应用",
    definition: "圣经应用很多，选的时候先看四点：一是用的是哪个译本，有没有写明出处和许可；二是读经、祷告的时候会不会跳出广告；三是免费试用到期会不会自动扣费；四是晚上用起来方不方便，比如有没有暗色屏幕、声音会不会太大。",
    quick: "在应用介绍里找译本名称和出处；在付款页面看清楚试用结束后会扣多少钱、怎么取消；看评论里有没有人提到广告。晚上要用的话，选能暗色显示、声音从小开始的应用。",
    bestFor: "想在手机上读经、祷告，又不想被广告打扰的人",
    sections: [
      ["一、译本和许可", `<p>中文圣经最常用的是和合本。现在很多应用用的是《新标点和合本》或《和合本修订版》，这两个版本由香港圣经公会管理版权。好的应用会在介绍或设置里写明译本名称和出处。看不到出处的，很难知道经文是不是准确。</p>
<p>1919年出版的和合本已经是公有领域，任何人都可以一字不改地使用。</p>`],
      ["二、广告", `<p>读经读到一半，或者睡前听经的时候突然跳出广告，心马上就乱了。免费的应用也要看一看：有没有广告，广告出现在哪里。应用介绍和用户评论里通常看得出来。</p>`],
      ["三、付款和免费试用", `<p>很多应用写着“免费试用7天”，到期后自动开始按年扣费。付款按钮旁边有没有写清楚哪天到期、扣多少钱？取消要按几下？在 iPhone 上，可以随时在 设置 › 你的名字 › 订阅 里取消。</p>`],
      ["四、晚上用起来方不方便", `<ul>
<li>打开时屏幕是不是暗色的</li>
<li>声音是不是从小开始，会不会吵醒身边的人</li>
<li>有没有定时关闭，听着睡着也没关系</li>
<li>关掉以后会不会还一直发通知</li>
</ul>
${V("PSA 127:2", "zh-Hans")}`],
      ["Peace Be Still 是什么样的应用？", `<p>说实话，它现在还不是中文圣经应用。Peace Be Still 现在是英文和西班牙文的，有英文钦定本（KJV）全本圣经、睡前轻声读诗篇（Psalm Nights）和每天早上一节经文（Morning Word），AI 圣经聊天随上架一起推出。没有广告，也没有到期自动扣费的免费试用。中文界面和中文经文还没有。详细情况请看<a href="${LANDING}">中文介绍</a>。</p>`],
    ],
    faq: [
      ["免费的圣经应用可以用吗？", "可以。只是要看一看有没有广告，以及隐私政策里怎么使用你的资料。"],
      ["中文和英文对照的圣经应用好吗？", "如果家里孩子英文更好，中英对照很方便，父母和孩子可以读同一节经文。选的时候也一样，看两个译本的出处。"],
      ["Peace Be Still 用的是哪个中文译本？", "应用里现在还没有中文经文。这个网站的中文页面用的是1919年和合本，一字不改，由繁体原文转成简体。"],
    ],
    related: [LANDING, ZQ.bedtime, ZQ.verses, ZQ.morning],
  },
  {
    ...BASE_ZH, path: ZQ.insomnia,
    title: "为失眠祷告：为自己，也为睡不好的家人 · Peace Be Still",
    description: "睡不着的时候怎样祷告？这里有为自己失眠的祷告、为睡不好的家人代祷的祷告、半夜醒来时的祷告，以及几节经文。也说明什么时候该去看医生。",
    h1: "为失眠祷告：为自己，也为睡不好的家人",
    indexLabel: "为失眠祷告",
    definition: "为失眠祷告，就是在睡不着的时候，把心里的焦虑和身体的疲惫都带到神面前，也为同样睡不好的家人代祷。祷告能让心安静下来，但它不是治疗。失眠很久的话，也请去看医生。",
    quick: "睡不着时不要和自己较劲。读一节经文，把正在想的事一件件交给神，然后安静地躺着。为家人代祷时，可以具体为他的身体、压力和睡眠祷告。失眠持续几个星期，请去看医生。",
    bestFor: "夜里睡不着或半夜醒来的人，家里有老人、配偶或孩子长期睡不好的人",
    sections: [
      ["睡不着的时候，先别急", `<p>越想睡越睡不着，是很多人都有过的经历。与其在床上和自己较劲，不如把这段醒着的时间当作和神说话的时间。不用打开灯，也不用拿起手机刷新闻。</p>
${V("PSA 63:5-6", "zh-Hans")}`],
      ["为自己失眠的祷告", prayer("主啊，现在已经很晚了，我还是睡不着。脑子里的事停不下来，身体很累，心也很乱。我把这些事一件一件交给你：工作的压力，家人的身体，还有将来的事。你应许把睡眠赐给你所亲爱的人，求你让我的心安静下来，在你里面得着安息。")],
      ["为睡不好的家人代祷", `${prayer("天父，我把我的家人带到你面前。他这些日子睡不好，白天很疲惫，心里也有很多压力。求你看顾他的身体，挪去他的忧虑，让他夜里能安然躺下。也求你给我们智慧，知道怎样照顾他，需要的时候带他去看医生。")}
${V("PSA 127:2", "zh-Hans")}`],
      ["半夜醒来的时候", `${prayer("主啊，我又醒了。谢谢你在黑夜里也和我同在。你是不打盹也不睡觉的神，所以我可以把这个夜晚交给你，安心地再躺下。")}
${V("PSA 121:3-4", "zh-Hans")}`],
      ["什么时候需要去看医生", SLEEP_NOTE],
    ],
    faq: [
      ["失眠是因为信心不够吗？", "不是。失眠有很多原因：压力、身体、作息，都有可能。圣经里的大卫也有夜里流泪的时候。请不要因为失眠责怪自己。"],
      ["可以吃安眠药吗？", "用不用药，请和医生商量。祷告和看医生并不冲突。"],
      ["睡不着的时候看手机读经可以吗？", "可以，但最好把亮度调到最低，只看一节经文，不要顺手刷其他东西。"],
    ],
    related: [LANDING, ZQ.verses, ZQ.bedtime, ZQ.evening],
    sources: [CUV_SRC, CUV_SRC2, LIFELINE_SRC],
  },
];

// The Chinese landing page lists the question pages from this file (six); keep the list complete.
if (ZH.length !== 1 + ALL_Q.length) throw new Error("NAMED STOP [ZH_PAGES_INCOMPLETE] a Chinese question page is missing");
