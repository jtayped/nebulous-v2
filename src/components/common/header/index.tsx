import React from "react";
import CurrentUser from "./user";

const Header = () => {
  return (
    <div className="flex justify-between gap-4">
      <div /> {/* Display breadcrumbs or so */}
      <CurrentUser />
    </div>
  );
};

export default Header;
