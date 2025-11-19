// components/UserBadge.tsx
interface Props {
  name: string;
  email: string;
}

export function UserBadge({ name, email }: Props) {
  const initial = (name || email).slice(0, 1).toUpperCase();
  const color = stringToColor(email); // couleur stable par email

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
      <span className="text-sm">{name}</span>
    </div>
  );
}

// helper très simple
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colour = `hsl(${hash % 360}, 70%, 60%)`;
  return colour;
}