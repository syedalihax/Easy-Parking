function GoogleIcon({ name, size = 18, className = '', style, ...props }) {
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ''}`.trim()}
      aria-hidden="true"
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
      {...props}
    >
      {name}
    </span>
  );
}

export default GoogleIcon;
