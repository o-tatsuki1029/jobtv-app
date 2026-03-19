"use client";

import Link from "next/link";
import { useFadeUp } from "../_shared/useFadeUp";
import "../_shared/lp-shared.css";
import "./event.css";

export default function EventPageClient() {
  useFadeUp();

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="hero" id="top">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content">
          <div>
            <div className="hero-tag">28卒向け</div>
            <h1>即日オファーがもらえる<br />就活イベント</h1>
            <p className="hero-subtitle">いい会社より、いい出会いを。</p>
            <div className="hero-free-badge">✓ 参加費無料 ✓ 初心者歓迎</div>
            <div className="hero-actions">
              <a href="#draft" className="btn-hero">📅 イベントを見る</a>
              <Link href="/agent" className="btn-hero-sub">エージェントを見る →</Link>
            </div>
          </div>
          <div>
            <div className="hero-screen">
              <div className="screen-header">
                <div className="screen-dot" /><div className="screen-dot" /><div className="screen-dot" />
                <div className="screen-url">jobtv.jp/event</div>
              </div>
              <div className="screen-body">
                <div className="vcard"><div className="vthumb vt1">▶</div><div><div className="vco">● 総合商社A社</div><div className="vtitle">若手社員のリアルな1日密着動画</div><div className="vmeta">3:24 · 社員インタビュー</div></div></div>
                <div className="vcard"><div className="vthumb vt2">▶</div><div><div className="vco">● IT企業B社</div><div className="vtitle">エンジニアチームの働き方・文化紹介</div><div className="vmeta">5:12 · 職場環境</div></div></div>
                <div className="vcard"><div className="vthumb vt3">▶</div><div><div className="vco">● メーカーC社</div><div className="vtitle">社長が語る「うちで活躍する人材」</div><div className="vmeta">4:48 · 採用メッセージ</div></div></div>
              </div>
              <div className="screen-live">LIVE</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat-item"><div className="stat-num">50,000<sup>+</sup></div><div className="stat-label">累計参加者数</div></div>
          <div className="stat-div" />
          <div className="stat-item"><div className="stat-num">91<sup>%</sup></div><div className="stat-label">スカウト獲得率</div></div>
          <div className="stat-div" />
          <div className="stat-item"><div className="stat-num">95<sup>%</sup></div><div className="stat-label">参加満足度</div></div>
          <div className="stat-div" />
          <div className="stat-item"><div className="stat-num">300<sup>+</sup></div><div className="stat-label">参加企業数</div></div>
        </div>
      </div>

      {/* ===== ABOUT ===== */}
      <section className="sec about" id="about">
        <div className="sec-inner">
          <div className="about-grid">
            <div className="fade-up">
              <div className="about-img-frame">
                <div className="play-center">▶</div>
                <div className="about-badge"><div className="about-badge-num">12社</div><div className="about-badge-label">1日で出会える最大企業数</div></div>
              </div>
            </div>
            <div className="fade-up d2">
              <div className="sec-label">ABOUT</div>
              <h2 className="sec-title">JOBTVイベントとは？</h2>
              <p className="sec-desc">企業動画を事前に視聴してからイベントに参加できる、動画ファーストの就活イベント。知ってから会うから、対話が深まりスカウトにつながります。</p>
              <ul className="about-list">
                <li><div className="about-icon">🎬</div><div><div className="about-list-title">事前に動画で企業研究が完結</div><div className="about-list-desc">参加前に企業の社風・仕事・文化を動画でチェック。当日の対話が格段に深まります。</div></div></li>
                <li><div className="about-icon">💬</div><div><div className="about-list-title">最大12社の人事と直接対話</div><div className="about-list-desc">1日で複数の企業担当者と話せるため、業界・企業研究を効率的に進められます。</div></div></li>
                <li><div className="about-icon">🏆</div><div><div className="about-list-title">対話評価をもとにスカウト獲得</div><div className="about-list-desc">対話の評価シートが公開され、あなたへのスカウト・オファーを確認できます。</div></div></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sec features">
        <div className="sec-inner">
          <div className="fade-up">
            <div className="sec-label">FEATURES</div>
            <h2 className="sec-title">選ばれる3つの理由</h2>
          </div>
          <div className="feat-grid">
            <div className="feat-card fade-up d1"><div className="feat-num">01</div><span className="feat-icon">📹</span><h3 className="feat-title"><span className="red">動画で事前準備</span>ができるから対話が深まる</h3><p className="feat-desc">企業の社員紹介・職場環境・仕事内容を動画で事前視聴。知ってから会うことで、質問の質が上がり人事担当者に強い印象を残せます。</p></div>
            <div className="feat-card fade-up d2"><div className="feat-num">02</div><span className="feat-icon">🎯</span><h3 className="feat-title">現役人事から<span className="red">直接フィードバック</span>をもらえる</h3><p className="feat-desc">対話ごとに異なる企業の人事担当者からフィードバックをもらえます。評価シートで自分の強みと改善点を1日で把握できます。</p></div>
            <div className="feat-card fade-up d3"><div className="feat-num">03</div><span className="feat-icon">🚀</span><h3 className="feat-title">最大12社から<span className="red">スカウトが届く</span></h3><p className="feat-desc">高評価を得ると複数の企業からスカウトを獲得できます。過去には大学3年9月に内定を獲得した学生も。スカウト後の特別選考ルートも充実。</p></div>
          </div>
        </div>
      </section>

      {/* JOIN BANNER */}
      <div className="join-banner">
        <div className="join-title fade-up">JOIN US!</div>
        <p className="join-sub fade-up">まずはイベントに参加してスカウトを獲得しよう！</p>
        <a href="#draft" className="btn-white fade-up">🎬 イベントを選ぶ ↓</a>
      </div>

      {/* ===== EVENT TYPES HEADER ===== */}
      <section className="ev-types-head">
        <div className="ev-types-head-inner">
          <div className="ev-types-eyebrow fade-up">EVENT TYPES</div>
          <h2 className="fade-up">4つの<span>イベント</span></h2>
          <p className="ev-types-desc fade-up">フェーズや目的に合わせて選べる4種類。<br />初めての方も、本選考直前の方も、それぞれのステージで最大の成果を。</p>

          <div className="ev-cards-strip fade-up">
            <a href="#draft" className="ev-card-pill draft-pill">
              <div className="pill-num">EVENT 01</div>
              <div className="pill-name">draft</div>
              <div className="pill-catch">初心者向け入門GD<br />オンライン開催</div>
            </a>
            <a href="#arena" className="ev-card-pill arena-pill">
              <div className="pill-num">EVENT 02</div>
              <div className="pill-name">arena</div>
              <div className="pill-catch">最大12社 × スカウト争奪<br />対面開催（東京）</div>
            </a>
            <a href="#summit" className="ev-card-pill summit-pill">
              <div className="pill-num">EVENT 03</div>
              <div className="pill-name">summit</div>
              <div className="pill-catch">難関企業特化 精鋭GD<br />招待制・選考あり</div>
            </a>
            <a href="#fes" className="ev-card-pill fes-pill">
              <div className="pill-num">EVENT 04</div>
              <div className="pill-name">fes</div>
              <div className="pill-catch">100社以上 年1回大型祭典<br />東京ビッグサイト</div>
            </a>
          </div>
        </div>
      </section>

      {/* ===== DRAFT ===== */}
      <section className="ev-section" id="draft">
        <div className="ev-inner">
          <div className="ev-hero-grid fade-up">
            <div>
              <div className="draft-ey">EVENT 01</div>
              <h2 className="draft-title">JOBTV<br /><span className="ac">draft</span></h2>
              <p className="draft-cp">動画で予習して、はじめてのGDに挑もう。</p>
              <p className="draft-desc">就活を始めたばかりの26・27卒向けの入門イベント。企業紹介動画を事前に視聴してからGDに挑むため、初心者でも安心して参加できます。複数社の人事から直接フィードバックをもらい、1日でGDのコツをつかめます。</p>
              <div className="badge-row"><span className="badge badge-free">✓ 参加費無料</span><span className="badge badge-ob">初心者歓迎</span><span className="badge badge-ob">26卒 · 27卒</span><span className="badge badge-ob">オンライン開催</span></div>
              <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "center" }}>
                <a href="#" className="btn-ev">📅 参加を申し込む</a>
                <a href="#" className="btn-sub">詳細を見る →</a>
              </div>
            </div>
            <div>
              <div className="sub-h">INTRODUCTION VIDEO</div>
              <div className="video-block">
                <div className="video-bg-grid" />
                <div className="video-overlay">
                  <div className="play-btn">▶</div>
                  <span className="video-tag">JOBTV draft 紹介動画</span>
                  <div className="video-cap">動画URLを挿入 · 約2分</div>
                </div>
              </div>
            </div>
          </div>
          <div className="ev-detail-grid fade-up d1">
            <div>
              <div className="sub-h">EVENT INFO</div>
              <div className="meta-card">
                <div className="meta-head">DETAIL</div>
                <div className="meta-row"><div className="meta-ico">📅</div><div><div className="meta-lbl">日時</div><div className="meta-val">随時開催（マイページより予約）</div></div></div>
                <div className="meta-row"><div className="meta-ico">📍</div><div><div className="meta-lbl">場所</div><div className="meta-val">オンライン（Zoom）</div></div></div>
                <div className="meta-row"><div className="meta-ico">👥</div><div><div className="meta-lbl">定員</div><div className="meta-val">1回 20〜30名</div></div></div>
                <div className="meta-row"><div className="meta-ico">⏱</div><div><div className="meta-lbl">所要時間</div><div className="meta-val">約3時間</div></div></div>
                <div className="meta-row"><div className="meta-ico">💰</div><div><div className="meta-lbl">参加費</div><div className="meta-val meta-free">無料</div></div></div>
              </div>
            </div>
            <div>
              <div className="sub-h">TIMELINE · イベントの流れ</div>
              <div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 01</div></div><div className="tl-title">ガイダンス・動画振り返り</div><div className="tl-desc">当日の流れと参加企業の紹介。事前動画を振り返りながら、GDのポイントを解説します。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:30</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 02</div></div><div className="tl-title">グループディスカッション 1回目</div><div className="tl-desc">15分のGDを実施。人事担当者がリアルタイムで観察し、終了後に個人フィードバックを行います。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">11:30</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 03</div></div><div className="tl-title">グループディスカッション 2〜3回目</div><div className="tl-desc">異なる企業の人事担当者と複数回GDを実施。毎回フィードバックをもらいながら上達を実感できます。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">12:45</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 04</div></div><div className="tl-title">企業対話会</div><div className="tl-desc">参加企業の人事と自由に話せる交流タイム。気になることを直接質問しましょう。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">13:30</div></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">AFTER</div></div><div className="tl-title">評価シート公開・スカウト受け取り</div><div className="tl-desc">当日の評価シートがマイページに公開。各社からのスカウトを確認できます。</div></div></div>
              </div>
            </div>
          </div>
          <div className="ev-footer-cta fade-up d2"><div><div className="efc-h">JOBTV draftで、初めてのGDを突破しよう！</div><div className="efc-s">初心者歓迎 · 完全無料 · オンライン開催</div></div><div className="efc-r"><a href="#" className="btn-sub">詳細を見る →</a><a href="#" className="btn-ev">📅 今すぐ申し込む</a></div></div>
        </div>
      </section>

      <div className="ev-div" style={{ background: "linear-gradient(90deg,var(--draft-accent),var(--arena-accent),transparent)" }} />

      {/* ===== ARENA ===== */}
      <section className="ev-section" id="arena">
        <div className="ev-inner">
          <div className="ev-hero-grid fade-up">
            <div>
              <div className="arena-ey">EVENT 02</div>
              <h2 className="arena-title">JOBTV<br /><span className="ac">arena</span></h2>
              <p className="arena-cp">最大12社が集結。スカウトをかけたGDバトル。</p>
              <p className="arena-desc">本選考さながらのグループディスカッションで、最大12社の人事担当者がリアルタイムに評価。動画で企業を知り抜いた状態で挑むから、対話の深さが段違いです。</p>
              <div className="badge-row"><span className="badge badge-free">✓ 参加費無料</span><span className="badge badge-ob">26卒 · 27卒</span><span className="badge badge-ob">対面開催（東京）</span><span className="badge badge-ob">スカウト獲得率 91%</span></div>
              <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "center" }}>
                <a href="#" className="btn-ev">📅 参加を申し込む</a>
                <a href="#" className="btn-sub">詳細を見る →</a>
              </div>
            </div>
            <div>
              <div className="sub-h">INTRODUCTION VIDEO</div>
              <div className="video-block">
                <div className="video-bg-grid" />
                <div className="video-overlay"><div className="play-btn">▶</div><span className="video-tag">JOBTV arena 紹介動画</span><div className="video-cap">動画URLを挿入 · 約2分</div></div>
              </div>
            </div>
          </div>
          <div className="ev-detail-grid fade-up d1">
            <div>
              <div className="sub-h">EVENT INFO</div>
              <div className="meta-card">
                <div className="meta-head">DETAIL</div>
                <div className="meta-row"><div className="meta-ico">📅</div><div><div className="meta-lbl">日時</div><div className="meta-val">月2回開催（土・日）</div></div></div>
                <div className="meta-row"><div className="meta-ico">📍</div><div><div className="meta-lbl">場所</div><div className="meta-val">東京都内会場（要確認）</div></div></div>
                <div className="meta-row"><div className="meta-ico">👥</div><div><div className="meta-lbl">定員</div><div className="meta-val">1回 50〜80名</div></div></div>
                <div className="meta-row"><div className="meta-ico">⏱</div><div><div className="meta-lbl">所要時間</div><div className="meta-val">1日（10:00〜17:00）</div></div></div>
                <div className="meta-row"><div className="meta-ico">💰</div><div><div className="meta-lbl">参加費</div><div className="meta-val meta-free">無料</div></div></div>
              </div>
            </div>
            <div>
              <div className="sub-h">TIMELINE · イベントの流れ</div>
              <div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 01</div></div><div className="tl-title">ガイダンス・企業動画上映</div><div className="tl-desc">当日のルール説明と参加企業の動画を一斉上映。事前視聴と合わせて企業理解を最終確認します。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:45</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 02</div></div><div className="tl-title">GDラウンド 1〜3（午前の部）</div><div className="tl-desc">15分 × 3社のGDを実施。1ラウンドごとに異なる企業の人事が評価・フィードバックします。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">13:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 03</div></div><div className="tl-title">企業対話会（ランチタイム）</div><div className="tl-desc">昼休憩を兼ねた企業ブース巡り。動画で気になった企業の人事に直接質問できます。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">14:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 04</div></div><div className="tl-title">GDラウンド 4〜5（午後の部）</div><div className="tl-desc">午後も異なる企業でGDを継続。午前のフィードバックを活かしてより高い評価を狙いましょう。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">16:00</div></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">AFTER</div></div><div className="tl-title">全体表彰・評価シート公開</div><div className="tl-desc">優秀者の発表と評価シートの開示。当日中にスカウト通知が届きます。</div></div></div>
              </div>
            </div>
          </div>
          <div className="ev-footer-cta fade-up d2"><div><div className="efc-h">JOBTV arenaで、スカウトを勝ち取ろう！</div><div className="efc-s">最大12社参加 · 完全無料 · 対面開催（東京）</div></div><div className="efc-r"><a href="#" className="btn-sub">詳細を見る →</a><a href="#" className="btn-ev">📅 今すぐ申し込む</a></div></div>
        </div>
      </section>

      <div className="ev-div" style={{ background: "linear-gradient(90deg,var(--arena-accent),var(--summit-gold),transparent)" }} />

      {/* ===== SUMMIT ===== */}
      <section className="ev-section" id="summit">
        <div className="ev-inner">
          <div className="ev-hero-grid fade-up">
            <div>
              <div className="summit-ey">EVENT 03</div>
              <h2 className="summit-title">JOBTV<br /><span className="ac">summit</span></h2>
              <p className="summit-cp">頂点を目指す者だけが集まる、精鋭イベント。</p>
              <p className="summit-desc">難関企業・外資・コンサル志望者向けの上位イベント。役員クラスの審査員による本番以上の密度のフィードバックと、ランチ懇親会が特別な体験を生みます。</p>
              <div className="badge-row"><span className="badge badge-free">✓ 参加費無料</span><span className="badge badge-ob">26卒 · 27卒</span><span className="badge badge-ob">難関企業特化</span><span className="badge badge-ob">招待制 / 選考あり</span></div>
              <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "center" }}>
                <a href="#" className="btn-ev">📅 参加を申し込む</a>
                <a href="#" className="btn-sub">詳細を見る →</a>
              </div>
            </div>
            <div>
              <div className="sub-h">INTRODUCTION VIDEO</div>
              <div className="video-block">
                <div className="video-bg-grid" />
                <div className="video-overlay"><div className="play-btn">▶</div><span className="video-tag">JOBTV summit 紹介動画</span><div className="video-cap">動画URLを挿入 · 約2分</div></div>
              </div>
            </div>
          </div>
          <div className="ev-detail-grid fade-up d1">
            <div>
              <div className="sub-h">EVENT INFO</div>
              <div className="meta-card">
                <div className="meta-head">DETAIL</div>
                <div className="meta-row"><div className="meta-ico">📅</div><div><div className="meta-lbl">日時</div><div className="meta-val">年4回開催（3・6・9・12月）</div></div></div>
                <div className="meta-row"><div className="meta-ico">📍</div><div><div className="meta-lbl">場所</div><div className="meta-val">東京都内 大型会場</div></div></div>
                <div className="meta-row"><div className="meta-ico">👥</div><div><div className="meta-lbl">定員</div><div className="meta-val">1回 100〜150名（選考あり）</div></div></div>
                <div className="meta-row"><div className="meta-ico">⏱</div><div><div className="meta-lbl">所要時間</div><div className="meta-val">1日（9:30〜18:00）</div></div></div>
                <div className="meta-row"><div className="meta-ico">💰</div><div><div className="meta-lbl">参加費</div><div className="meta-val meta-free">無料</div></div></div>
              </div>
            </div>
            <div>
              <div className="sub-h">TIMELINE · イベントの流れ</div>
              <div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">09:30</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 01</div></div><div className="tl-title">開会式・企業動画プレミアム上映</div><div className="tl-desc">役員・経営者クラスのメッセージ動画を特別上映。企業の本質を深く理解してからGDへ。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:30</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 02</div></div><div className="tl-title">GDラウンド 1〜3 / 役員クラス審査</div><div className="tl-desc">人事だけでなく事業部長・役員クラスが審査員として参加。本番以上の密度のフィードバックが得られます。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">13:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 03</div></div><div className="tl-title">ランチ懇親会（企業役員と同席）</div><div className="tl-desc">参加企業の役員・人事とランチを共にする特別タイム。内定に直結するネットワーキングの場です。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">14:30</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STEP 04</div></div><div className="tl-title">GDラウンド 4〜5 / ファイナルラウンド</div><div className="tl-desc">累計スコアで選抜されたファイナリストによる最終GD。最優秀者には特別選考ルートが贈られます。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">17:00</div></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">AFTER</div></div><div className="tl-title">表彰式・特別スカウト発表</div><div className="tl-desc">優秀者への企業からの特別オファー発表。評価シートとともにスカウト通知が届きます。</div></div></div>
              </div>
            </div>
          </div>
          <div className="ev-footer-cta fade-up d2"><div><div className="efc-h">JOBTV summitで、頂点を目指そう。</div><div className="efc-s">難関企業特化 · 完全無料 · 年4回開催</div></div><div className="efc-r"><a href="#" className="btn-sub">詳細を見る →</a><a href="#" className="btn-ev">📅 今すぐ申し込む</a></div></div>
        </div>
      </section>

      <div className="ev-div" style={{ background: "linear-gradient(90deg,var(--summit-gold),var(--fes-accent),transparent)" }} />

      {/* ===== FES ===== */}
      <section className="ev-section" id="fes">
        <div className="confetti" aria-hidden="true">
          <span style={{ left: "5%", top: "20%", background: "#FFB800", animationDelay: "0s" }} />
          <span style={{ left: "18%", top: "65%", background: "#FF6B00", animationDelay: ".5s" }} />
          <span style={{ left: "30%", top: "30%", background: "#E8001D", animationDelay: "1s" }} />
          <span style={{ left: "72%", top: "22%", background: "#FFB800", animationDelay: "1.5s" }} />
          <span style={{ left: "85%", top: "55%", background: "#FF6B00", animationDelay: ".8s" }} />
          <span style={{ left: "92%", top: "15%", background: "#4A90E2", animationDelay: ".3s" }} />
        </div>
        <div className="ev-inner">
          <div className="ev-hero-grid fade-up">
            <div>
              <div className="fes-ey">EVENT 04</div>
              <h2 className="fes-title">JOBTV<br /><span className="ac">fes</span></h2>
              <p className="fes-cp">年1回、全就活生が集う最大の就活フェス。</p>
              <p className="fes-desc">業界・規模・職種を超えた100社以上が集結する年間最大イベント。企業動画ブース・GDステージ・トークセッション・懇親会が1日に凝縮。就活の全ステップをこの1日で体験しよう。</p>
              <div className="badge-row"><span className="badge badge-free">✓ 参加費無料</span><span className="badge badge-ob">26卒 · 27卒</span><span className="badge badge-ob">100社以上参加</span><span className="badge badge-ob">年1回 大型会場</span></div>
              <div style={{ marginTop: 28, display: "flex", gap: 14, alignItems: "center" }}>
                <a href="#" className="btn-ev">🎪 参加を申し込む</a>
                <a href="#" className="btn-sub">詳細を見る →</a>
              </div>
            </div>
            <div>
              <div className="sub-h">INTRODUCTION VIDEO</div>
              <div className="video-block">
                <div className="video-bg-grid" />
                <div className="video-overlay"><div className="play-btn">▶</div><span className="video-tag">JOBTV fes 紹介動画</span><div className="video-cap">動画URLを挿入 · 約3分</div></div>
              </div>
            </div>
          </div>
          <div className="ev-detail-grid fade-up d1">
            <div>
              <div className="sub-h">EVENT INFO</div>
              <div className="meta-card">
                <div className="meta-head">DETAIL</div>
                <div className="meta-row"><div className="meta-ico">📅</div><div><div className="meta-lbl">日時</div><div className="meta-val">年1回（夏季開催 · 8月予定）</div></div></div>
                <div className="meta-row"><div className="meta-ico">📍</div><div><div className="meta-lbl">場所</div><div className="meta-val">東京ビッグサイト 他大型会場</div></div></div>
                <div className="meta-row"><div className="meta-ico">👥</div><div><div className="meta-lbl">定員</div><div className="meta-val">2,000名（先着順）</div></div></div>
                <div className="meta-row"><div className="meta-ico">⏱</div><div><div className="meta-lbl">所要時間</div><div className="meta-val">1日（10:00〜19:00）</div></div></div>
                <div className="meta-row"><div className="meta-ico">💰</div><div><div className="meta-lbl">参加費</div><div className="meta-val meta-free">無料</div></div></div>
              </div>
            </div>
            <div>
              <div className="sub-h">TIMELINE · イベントの流れ</div>
              <div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">10:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">OPEN</div></div><div className="tl-title">開場・企業動画ブース OPEN</div><div className="tl-desc">100社以上の企業動画ブースがオープン。社員インタビュー・職場紹介動画を自由に視聴しながら気になる企業を絞り込もう。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">11:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STAGE A</div></div><div className="tl-title">GDステージ（午前の部）</div><div className="tl-desc">メインステージで行われる公開GD。高評価者にはその場でスカウトが贈られることも！</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">13:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STAGE B</div></div><div className="tl-title">トークセッション・パネルディスカッション</div><div className="tl-desc">各業界リーダーや内定者によるトークセッション。就活のリアルな声を直接聞けます。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">15:00</div><div className="tl-line" /></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">STAGE A</div></div><div className="tl-title">GDステージ（午後の部）</div><div className="tl-desc">午後も引き続きGDステージを開催。新たな企業の審査員と共にスカウトを狙いましょう。</div></div></div>
                <div className="tl-item"><div className="tl-left"><div className="tl-time">17:30</div></div><div className="tl-right"><div className="tl-dot-row"><div className="tl-dot" /><div className="tl-step-label">FINALE</div></div><div className="tl-title">懇親会・フィナーレセレモニー</div><div className="tl-desc">学生・企業・JOBTVスタッフ全員参加の懇親会。スカウト結果の発表と熱いメッセージで幕を閉じます。</div></div></div>
              </div>
            </div>
          </div>
          <div className="ev-footer-cta fade-up d2"><div><div className="efc-h">JOBTV fesで、就活を一気に加速させよう！</div><div className="efc-s">100社以上参加 · 完全無料 · 年1回限定開催</div></div><div className="efc-r"><a href="#" className="btn-sub">詳細を見る →</a><a href="#" className="btn-ev">🎪 今すぐ申し込む</a></div></div>
        </div>
      </section>

      {/* GLOBAL CTA */}
      <section className="global-cta">
        <div className="gc-inner fade-up">
          <div className="gc-title">WATCH · <span>SCOUT</span> · WIN</div>
          <p className="gc-sub">JOBTVのイベントで、あなたの就活を加速させよう。</p>
          <div className="gc-btns">
            <a href="#draft" className="btn-gc-main">🎬 イベントに参加する</a>
            <a href="#top" className="btn-gc-sub">↑ ページトップへ</a>
          </div>
        </div>
      </section>

      {/* CROSS LINK → エージェント */}
      <section className="cross-link-agent">
        <div className="cross-link-inner">
          <div className="cross-link-left">
            <div className="cross-link-icon cross-link-icon--agent">👤</div>
            <div>
              <div className="cross-link-label" style={{ color: "#4A90E2" }}>JOBTV AGENT</div>
              <div className="cross-link-title">就活エージェントもJOBTVにおまかせ</div>
              <div className="cross-link-desc">専任アドバイザーが内定まで完全無料で伴走。自己分析〜内定後フォローまで一気通貫。</div>
            </div>
          </div>
          <div className="cross-link-right">
            <div className="cross-link-note">✓ 完全無料 &nbsp;✓ オンライン対応 &nbsp;✓ 登録60秒</div>
            <Link href="/agent" className="btn-cross-link" style={{ background: "#4A90E2" }}>エージェントはこちら →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
