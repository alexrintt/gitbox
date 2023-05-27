// icon:bx-crop | Boxicons https://boxicons.com/ | Atisa
import * as React from "react";

function IconBxCrop(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      height="1em"
      width="1em"
      {...props}
    >
      <path d="M19 7c0-1.103-.897-2-2-2H7V2H5v3H2v2h15v15h2v-3h3v-2h-3V7z" />
      <path d="M5 9v8c0 1.103.897 2 2 2h8v-2H7V9H5z" />
    </svg>
  );
}

export default IconBxCrop;
