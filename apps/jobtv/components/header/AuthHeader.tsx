import Logo from "./Logo";
import HeaderContainer from "./HeaderContainer";

export default function AuthHeader() {
  return (
    <HeaderContainer alignStart>
      <Logo disableLink />
    </HeaderContainer>
  );
}
