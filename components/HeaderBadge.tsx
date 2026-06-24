import Image from "next/image";

export function HeaderBadge() {
  return (
    <div className="header-icon-card pixel-card">
      <Image
        alt=""
        aria-hidden="true"
        height={58}
        priority
        src="/icon1.png"
        width={58}
      />
    </div>
  );
}
