"use client";

import Link from "next/link";
import { useFadeUp } from "../_shared/useFadeUp";
import "../_shared/lp-shared.css";
import "./agent.css";

export default function AgentPageClient() {
  useFadeUp();

  return (
    <>
      {/* ===== AGENT HERO ===== */}
      <section className="agent-section" id="agent">
        <div className="agent-circles" />
        <div className="agent-inner">
          <div className="agent-grid fade-up">
            <div>
              <div className="agent-tag">新卒向け就活エージェント · 26卒・27卒</div>
              <h2 className="agent-h1"><em>JOBTV</em>専任アドバイザーと二人三脚で、納得できる内定へ。</h2>
              <p className="agent-desc">JOBTVエージェントは、専任アドバイザーが内定まで完全無料で伴走する就活エージェント。自己分析から選考対策・内定後フォローまで一気通貫でサポートします。</p>
              <div className="agent-btns">
                <a href="#agent-cta" className="btn-ag-main">📅 無料面談を申し込む</a>
                <a href="#agent-flow" className="btn-ag-sub">サービスの流れを見る</a>
                <p className="ag-note">✓ 登録60秒 ✓ 完全無料 ✓ オンライン面談可</p>
              </div>
            </div>
            <div className="advisor-card">
              <div className="adv-header">
                <div className="adv-avatar">👤</div>
                <div><div className="adv-name">専任アドバイザー</div><div className="adv-title">キャリアアドバイザー · 担当歴5年</div></div>
                <div className="adv-badge">● オンライン</div>
              </div>
              <div className="adv-msg">「あなたの強みと価値観を一緒に言語化して、本当に合う企業を見つけましょう。内定後の意思決定まで、ずっと伴走します。」</div>
              <div className="adv-services">
                <div className="svc-row"><div className="svc-left"><span className="svc-ico">📝</span><span className="svc-name">自己分析・ES添削</span></div><span className="svc-status status-free">無料</span></div>
                <div className="svc-row"><div className="svc-left"><span className="svc-ico">🎯</span><span className="svc-name">面接対策・模擬面接</span></div><span className="svc-status status-free">無料</span></div>
                <div className="svc-row"><div className="svc-left"><span className="svc-ico">🏢</span><span className="svc-name">大手〜ベンチャー紹介</span></div><span className="svc-status status-match">専任担当制</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ACHIEVEMENT ===== */}
      <section className="ag-achieve-sec">
        <div className="sec-inner">
          <div className="fade-up" style={{ textAlign: "center" }}>
            <div className="sec-label" style={{ justifyContent: "center" }}>ACHIEVEMENT</div>
            <h2 className="sec-title">JOBTVエージェントの実績</h2>
            <p className="sec-desc" style={{ margin: "0 auto 56px", textAlign: "center" }}>累計支援実績と内定率で、信頼のエージェントを選ぼう。</p>
          </div>
          <div className="achieve-grid fade-up d1">
            <div className="achieve-card">
              <div className="achieve-num">10,000<span>+</span></div>
              <div className="achieve-label">累計支援学生数</div>
              <div className="achieve-desc">サービス開始から累計1万人以上の学生を支援。毎年多くの学生が納得の内定を獲得しています。</div>
            </div>
            <div className="achieve-card achieve-card--red">
              <div className="achieve-num">92<span>%</span></div>
              <div className="achieve-label">志望業界内定率</div>
              <div className="achieve-desc">92%の利用者が希望する業界・職種での内定を獲得。的確なマッチングと選考対策が強みです。</div>
            </div>
            <div className="achieve-card">
              <div className="achieve-num">4.8<span>/5</span></div>
              <div className="achieve-label">利用者満足度</div>
              <div className="achieve-desc">「また使いたい・友人に勧めたい」と答えた学生は96%。アドバイザーの質の高さに定評があります。</div>
            </div>
            <div className="achieve-card">
              <div className="achieve-num">500<span>+</span></div>
              <div className="achieve-label">掲載求人企業数</div>
              <div className="achieve-desc">大手・外資・成長ベンチャーまで500社以上と提携。非公開求人も多数保有しています。</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARTNER COMPANIES ===== */}
      <section className="partner-sec">
        <div className="sec-inner">
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="sec-label" style={{ justifyContent: "center" }}>PARTNER COMPANIES</div>
            <h2 className="sec-title" style={{ marginBottom: 8 }}>JOBTVに掲載している企業</h2>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>各業界を代表する大手・優良企業と提携しています</p>
          </div>

          <div className="logo-grid fade-up d1">
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="40" height="40" rx="4" fill="#003087" />
                <text x="24" y="29" fontFamily="Arial" fontWeight="900" fontSize="18" fill="white" textAnchor="middle">M</text>
                <text x="56" y="20" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">MARUBENI</text>
                <text x="56" y="33" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">CORPORATION</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="20" fill="#E60012" />
                <text x="24" y="29" fontFamily="Arial" fontWeight="900" fontSize="16" fill="white" textAnchor="middle">み</text>
                <text x="56" y="21" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">MIZUHO</text>
                <text x="56" y="34" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">FINANCIAL GROUP</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="14" width="36" height="20" rx="3" fill="#1B1B1B" />
                <text x="22" y="28" fontFamily="Arial" fontWeight="900" fontSize="12" fill="white" textAnchor="middle">BCG</text>
                <text x="50" y="21" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">Boston</text>
                <text x="50" y="33" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">Consulting</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="32" height="32" rx="8" fill="#0061FF" />
                <text x="20" y="29" fontFamily="Arial" fontWeight="900" fontSize="16" fill="white" textAnchor="middle">N</text>
                <text x="46" y="21" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">NTT DATA</text>
                <text x="46" y="34" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">GROUP</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="24,4 44,44 4,44" fill="#E8001D" />
                <text x="56" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">TOYOTA</text>
                <text x="56" y="35" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">MOTOR CORP.</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="12" width="36" height="24" rx="12" fill="#FF6B00" />
                <text x="22" y="28" fontFamily="Arial" fontWeight="900" fontSize="10" fill="white" textAnchor="middle">D</text>
                <text x="50" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">DENTSU</text>
                <text x="50" y="34" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">GROUP INC.</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="40" height="40" rx="2" fill="#003F88" />
                <text x="24" y="31" fontFamily="Arial" fontWeight="900" fontSize="22" fill="white" textAnchor="middle">三</text>
                <text x="55" y="21" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">MITSUI</text>
                <text x="55" y="33" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">FUDOSAN</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="14" width="32" height="20" rx="4" fill="#00205B" />
                <text x="20" y="28" fontFamily="Arial" fontWeight="900" fontSize="11" fill="white" textAnchor="middle">GS</text>
                <text x="46" y="21" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">Goldman</text>
                <text x="46" y="33" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#1a1a1a">Sachs</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="18" fill="#E60012" />
                <circle cx="24" cy="24" r="10" fill="white" />
                <circle cx="24" cy="24" r="5" fill="#E60012" />
                <text x="52" y="22" fontFamily="Arial" fontWeight="700" fontSize="12" fill="#1a1a1a">SoftBank</text>
                <text x="52" y="35" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">CORP.</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="32" height="32" rx="16" fill="#FF9900" />
                <text x="20" y="29" fontFamily="Arial" fontWeight="900" fontSize="14" fill="white" textAnchor="middle">a</text>
                <text x="46" y="22" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">Amazon</text>
                <text x="46" y="34" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">JAPAN</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="40" height="40" rx="4" fill="#0074BF" />
                <text x="24" y="31" fontFamily="Arial" fontWeight="900" fontSize="20" fill="white" textAnchor="middle">R</text>
                <text x="54" y="21" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">RECRUIT</text>
                <text x="54" y="33" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">HOLDINGS</text>
              </svg>
            </div>
            <div className="logo-item">
              <svg viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="20" fill="#E8001D" />
                <text x="24" y="28" fontFamily="Arial" fontWeight="900" fontSize="12" fill="white" textAnchor="middle">キ</text>
                <text x="54" y="21" fontFamily="Arial" fontWeight="700" fontSize="11" fill="#1a1a1a">KIRIN</text>
                <text x="54" y="34" fontFamily="Arial" fontWeight="400" fontSize="8" fill="#888">HOLDINGS</text>
              </svg>
            </div>
          </div>
          <div className="logo-note fade-up d2">※ロゴは掲載企業のイメージです。実際の掲載企業はサービス内でご確認ください。</div>
        </div>
      </section>

      {/* ===== AGENT FLOW ===== */}
      <section className="agent-flow" id="agent-flow">
        <div className="sec-inner">
          <div className="fade-up" style={{ textAlign: "center" }}><div className="sec-label" style={{ justifyContent: "center" }}>FLOW</div><h2 className="sec-title">サポートの流れ</h2></div>
          <div className="flow-steps">
            <div className="flow-step fade-up d1"><div className="flow-circle">📝</div><div className="flow-body"><div className="flow-num">STEP 01</div><h3 className="flow-title">無料登録・初回面談</h3><p className="flow-desc">60秒で登録完了。専任アドバイザーとの初回面談で現状や希望をヒアリングします。オンライン対応なので全国どこからでも参加可能。</p><span className="flow-tag">オンライン可 · 約60分</span></div></div>
            <div className="flow-step fade-up d1"><div className="flow-circle">🎯</div><div className="flow-body"><div className="flow-num">STEP 02</div><h3 className="flow-title">自己分析 × 企業マッチング</h3><p className="flow-desc">アドバイザーと一緒に就活の軸を言語化し、あなたに合う企業を厳選。大手から成長ベンチャーまで500社以上の求人からベストマッチを提案します。</p><span className="flow-tag">独自マッチングシステム</span></div></div>
            <div className="flow-step fade-up d1"><div className="flow-circle">📋</div><div className="flow-body"><div className="flow-num">STEP 03</div><h3 className="flow-title">ES添削・面接対策</h3><p className="flow-desc">あなたの強みを最大限引き出すES添削と、企業別の模擬面接を実施。本番前に徹底的に準備することで選考通過率を高めます。</p><span className="flow-tag">ES添削 · 模擬面接</span></div></div>
            <div className="flow-step fade-up d1"><div className="flow-circle">🏆</div><div className="flow-body"><div className="flow-num">STEP 04</div><h3 className="flow-title">内定・意思決定サポート</h3><p className="flow-desc">内定獲得後も終わりではありません。複数内定の比較・意思決定まで、アドバイザーが伴走。納得のいくキャリアスタートを支援します。</p><span className="flow-tag">内定後フォローあり</span></div></div>
          </div>
        </div>
      </section>

      {/* ===== VOICE ===== */}
      <section className="ag-voice-sec">
        <div className="sec-inner">
          <div className="fade-up" style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="sec-label" style={{ justifyContent: "center" }}>VOICE</div>
            <h2 className="sec-title">エージェント利用者の声</h2>
            <p className="sec-desc" style={{ margin: "0 auto", textAlign: "center" }}>JOBTVエージェントを使って内定を獲得した先輩たちの声</p>
          </div>
          <div className="voice-grid fade-up d1">
            <div className="voice-card-ag">
              <div className="vc-top">
                <div className="vc-avatar" style={{ background: "linear-gradient(135deg,#4A90E2,#1a5fa8)" }}>S</div>
                <div className="vc-info">
                  <div className="vc-name">Sさん</div>
                  <div className="vc-school">早稲田大学 商学部 · 26卒</div>
                  <div className="vc-company">→ 大手総合商社 内定</div>
                </div>
                <div className="vc-stars">★★★★★</div>
              </div>
              <div className="vc-quote">「自己分析から本質的に向き合えた」</div>
              <p className="vc-text">就活を始めたばかりで何から手をつければいいかわからなかったのですが、アドバイザーさんが丁寧に自己分析をサポートしてくれました。自分でも気づかなかった強みを言語化でき、面接でも自信を持って話せるようになりました。</p>
            </div>

            <div className="voice-card-ag">
              <div className="vc-top">
                <div className="vc-avatar" style={{ background: "linear-gradient(135deg,#E8001D,#a00014)" }}>A</div>
                <div className="vc-info">
                  <div className="vc-name">Aさん</div>
                  <div className="vc-school">慶應義塾大学 法学部 · 26卒</div>
                  <div className="vc-company">→ 外資系コンサルファーム 内定</div>
                </div>
                <div className="vc-stars">★★★★★</div>
              </div>
              <div className="vc-quote">「非公開求人で第一志望に出会えた」</div>
              <p className="vc-text">自分では見つけられなかった非公開求人を紹介してもらいました。ESから最終面接まで細かく対策してもらい、結果的に第一志望の外資コンサルから内定をもらえました。担当してくれたアドバイザーさんには本当に感謝しています。</p>
            </div>

            <div className="voice-card-ag">
              <div className="vc-top">
                <div className="vc-avatar" style={{ background: "linear-gradient(135deg,#D4AF37,#a07d20)" }}>K</div>
                <div className="vc-info">
                  <div className="vc-name">Kさん</div>
                  <div className="vc-school">東京大学 工学部 · 26卒</div>
                  <div className="vc-company">→ メガベンチャー エンジニア 内定</div>
                </div>
                <div className="vc-stars">★★★★★</div>
              </div>
              <div className="vc-quote">「軸がブレていた自分を整理してくれた」</div>
              <p className="vc-text">大手かベンチャーか迷っていたところ、アドバイザーさんが「やりたいこと」と「向いていること」を丁寧に整理してくれました。結果、メガベンチャーのエンジニアという明確なゴールが見えて、迷いなく就活を進められました。</p>
            </div>

            <div className="voice-card-ag">
              <div className="vc-top">
                <div className="vc-avatar" style={{ background: "linear-gradient(135deg,#2ECC71,#1a8a4a)" }}>M</div>
                <div className="vc-info">
                  <div className="vc-name">Mさん</div>
                  <div className="vc-school">明治大学 経営学部 · 27卒</div>
                  <div className="vc-company">→ 大手メーカー 営業職 内定</div>
                </div>
                <div className="vc-stars">★★★★☆</div>
              </div>
              <div className="vc-quote">「地方からでもオンラインで完結できた」</div>
              <p className="vc-text">地方大学在学中だったので東京の就活情報に疎かったのですが、オンライン面談で全てのサポートを受けられました。模擬面接も何度もやってもらい、本番では緊張せず話せました。地方の学生にも絶対おすすめです。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AGENT CTA ===== */}
      <section className="agent-cta-sec" id="agent-cta">
        <div className="agent-cta-inner">
          <div className="agent-cta-bg" />
          <div className="agent-cta-content fade-up">
            <div className="agent-cta-label">FREE CONSULTATION</div>
            <h2 className="agent-cta-title">まず、話してみませんか？</h2>
            <p className="agent-cta-desc">
              就活の悩み・不安・何から始めるべきかわからない——<br />
              そんな状態でも大丈夫。専任アドバイザーが丁寧にヒアリングします。
            </p>
            <div className="agent-cta-badges">
              <span className="cta-badge">✓ 完全無料</span>
              <span className="cta-badge">✓ 登録60秒</span>
              <span className="cta-badge">✓ オンライン対応</span>
              <span className="cta-badge">✓ 内定まで無制限サポート</span>
            </div>
            <div className="agent-cta-form">
              <div className="cta-form-row">
                <input type="text" className="cta-input" placeholder="お名前（例：山田 太郎）" />
                <input type="email" className="cta-input" placeholder="メールアドレス" />
                <select className="cta-input cta-select" defaultValue="">
                  <option value="" disabled>卒業予定年度</option>
                  <option>2026年卒（26卒）</option>
                  <option>2027年卒（27卒）</option>
                  <option>2028年卒（28卒）</option>
                </select>
              </div>
              <button type="button" className="btn-cta-submit">無料で面談を申し込む →</button>
              <p className="cta-note">個人情報は適切に管理されます。迷惑メールは一切送りません。</p>
            </div>
          </div>
        </div>
      </section>

      {/* CROSS LINK → イベント */}
      <section className="cross-link-event">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(232,0,29,.15)", border: "2px solid rgba(232,0,29,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🎬</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 700, color: "#E8001D", marginBottom: 5 }}>JOBTV EVENT</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>就活イベントでスカウトを獲得しよう</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginTop: 5 }}>draft / arena / summit / fes — 4種類のイベントから選んで参加。完全無料。スカウト獲得率91%。</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>✓ 完全無料 &nbsp;✓ 26卒・27卒対象 &nbsp;✓ スカウト獲得率91%</div>
            <Link href="/event" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#E8001D", color: "#fff", padding: "15px 36px", borderRadius: 4, fontSize: 15, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>イベントはこちら →</Link>
          </div>
        </div>
      </section>

      {/* GLOBAL CTA */}
      <section className="global-cta">
        <div className="gc-inner fade-up">
          <div className="gc-title">WATCH · <span>SCOUT</span> · WIN</div>
          <p className="gc-sub">JOBTVで、あなたの就活を加速させよう。</p>
          <div className="gc-btns">
            <Link href="/event" className="btn-gc-main">🎬 イベントに参加する</Link>
            <a href="#agent" className="btn-gc-sub">👤 エージェントに相談する</a>
          </div>
        </div>
      </section>
    </>
  );
}
