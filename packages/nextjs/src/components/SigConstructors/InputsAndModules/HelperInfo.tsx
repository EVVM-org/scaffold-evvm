import React from "react";

interface TokenAddressInfoProps {
  label?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}


export const HelperInfo: React.FC<TokenAddressInfoProps> = ({ label = "Info", children, style }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const hideTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hoveringRef = React.useRef(false);

  // Always keep hoveringRef in sync with state
  React.useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  const handleShow = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowTooltip(true);
    setHovering(true);
  };
  const handleHide = () => {
    setHovering(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!hoveringRef.current) setShowTooltip(false);
    }, 1000);
  };

  // If mouse re-enters before timer, cancel hide
  const handleTooltipEnter = () => {
    setHovering(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };
  const handleTooltipLeave = () => {
    setHovering(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!hoveringRef.current) setShowTooltip(false);
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block", marginBottom: "1rem", ...style }}>
      <span
        style={{
          textDecoration: "underline dotted",
          cursor: "pointer",
          color: "#0070f3",
          fontWeight: 500,
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
        }}
        tabIndex={0}
        onMouseEnter={handleShow}
        onFocus={handleShow}
        onMouseLeave={handleHide}
        onBlur={handleHide}
      >
        <span style={{ fontSize: 13 }}>{label}</span>
        <span
          style={{
            fontSize: 13,
            marginLeft: 2,
            fontWeight: 700,
            color: "#0070f3",
            userSelect: "none",
          }}
          onMouseEnter={handleShow}
          onFocus={handleShow}
          onMouseLeave={handleHide}
          onBlur={handleHide}
        >
          &nbsp;(?)
        </span>
      </span>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: "1.5rem",
            background: "#222",
            color: "#fff",
            padding: "0.75rem 1.25rem",
            borderRadius: 8,
            fontSize: 14,
            zIndex: 10,
            minWidth: 260,
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.12)",
            whiteSpace: "pre-line",
          }}
          role="tooltip"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          {children}
        </div>
      )}
    </div>
  );
};
