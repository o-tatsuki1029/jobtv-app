"use client";

import { useState } from "react";
import Logo from "./Logo";
import Navigation from "./Navigation";
import GuestActions from "./GuestActions";
import MenuToggleButton from "./MenuToggleButton";
import MobileNavigation from "./MobileNavigation";
import RecruiterMenu from "./RecruiterMenu";
import CandidateMenu from "./CandidateMenu";
import HeaderContainer from "./HeaderContainer";
import MainThemeToggle from "./MainThemeToggle";
import { useHeaderAuth } from "./HeaderAuthContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const authInfo = useHeaderAuth();
  const user = authInfo?.user ?? null;
  const role = authInfo?.role ?? null;
  const recruiterMenuInfo = authInfo?.recruiterMenuInfo ?? null;
  const isRecruiter = !!user && role === "recruiter";
  const isCandidate = !!user && role !== "recruiter";

  return (
    <HeaderContainer>
      {/* Logo and Navigation */}
      <div className="flex">
        <Logo />
        <Navigation />
      </div>

      {/* Right side actions（レイアウトでロール取得済みのため遅延なし） */}
      <div className="flex items-center gap-2 md:gap-4">
        <MainThemeToggle />
        {user ? (
          isRecruiter ? (
            <MenuToggleButton
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white hover:text-red-500 transition-colors"
            />
          ) : (
            <MenuToggleButton
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white hover:text-red-500 transition-colors"
            />
          )
        ) : (
          <>
            <GuestActions className="hidden xl:flex" />
            <MenuToggleButton
              isOpen={isMenuOpen}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex xl:hidden"
            />
          </>
        )}
      </div>

      {/* ゲスト用モバイルメニュー */}
      {!user && <MobileNavigation isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />}

      {/* リクルーター用ハンバーガーメニュー */}
      {isRecruiter && (
        <RecruiterMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          userName={user?.email?.split("@")[0] || "ユーザー"}
          menuInfo={recruiterMenuInfo}
        />
      )}

      {/* 候補者用ハンバーガーメニュー（企業ログイン時と同じスタイル） */}
      {isCandidate && (
        <CandidateMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          userName={user?.email?.split("@")[0] || "ユーザー"}
        />
      )}
    </HeaderContainer>
  );
}
