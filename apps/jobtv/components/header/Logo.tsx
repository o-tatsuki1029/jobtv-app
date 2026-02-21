import Image from "next/image";

interface LogoProps {
  disableLink?: boolean;
}

export default function Logo({ disableLink = false }: LogoProps) {
  const content = (
    <Image
      src="https://jobtv.jp/assets/logo.svg"
      alt="JOBTV"
      width={120}
      height={28}
      className="h-6 md:h-7 w-auto"
      style={{ width: "auto" }}
      priority
    />
  );

  return (
    <div className="flex items-center mr-12">
      {disableLink ? (
        <div className="flex items-center">{content}</div>
      ) : (
        <a href="/" className="flex items-center">
          {content}
        </a>
      )}
    </div>
  );
}
