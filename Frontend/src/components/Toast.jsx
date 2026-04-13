// Toast.jsx
// A small feedback banner that shows a success or error message.
// It appears at the top of a form and disappears after a few seconds.
//
// Props:
//   message – the text to display
//   type    – 'success' (green) or 'error' (red)

function Toast({ message, type = 'success' }) {
  // Don't render anything if there's no message
  if (!message) return null;

  const icon = type === 'success' ? '✅' : '❌';

  return (
    <div className={`toast ${type} fade-in`} role="alert">
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
