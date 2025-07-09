import { FunctionalComponent, h } from 'preact';

interface ContactProfileCardProps {
  logo?: string;
  name?: string;
  lastSeen?: string;
  bio?: string;
  website?: string;
  email?: string;
  phone?: string;
}

export const ContactProfileCard: FunctionalComponent<ContactProfileCardProps> = ({
  logo,
  name = '',
  lastSeen = 'Last seen recently',
  bio,
  website,
  email,
  phone,
}) => (
  <div class="w-full flex flex-col items-center gap-2 p-4 bg-zinc-900 rounded-xl shadow">
    {logo && (
      <div class="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-800 border-2 border-zinc-700">
        <img
          src={logo}
          alt={name}
          class="w-full h-full object-cover"
        />
      </div>
    )}
    <h2 class="text-lg sm:text-xl font-bold text-white text-center w-full break-words">{name}</h2>
    <div class="text-xs text-zinc-400 mb-2 text-center w-full">{lastSeen}</div>
    {bio && (
      <div class="w-full mb-2">
        <div class="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Bio</div>
        <div class="text-sm text-zinc-200 break-words">{bio}</div>
      </div>
    )}
    {phone && (
      <div class="w-full mb-1">
        <div class="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Mobile</div>
        <div class="text-sm text-zinc-200 break-words">{phone}</div>
      </div>
    )}
    {email && (
      <div class="w-full mb-1">
        <div class="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Email</div>
        <div class="text-sm text-zinc-200 break-all">{email}</div>
      </div>
    )}
    {website && (
      <div class="w-full mb-1">
        <div class="text-xs text-zinc-400 uppercase tracking-wide font-semibold mb-1">Website</div>
        <a
          href={website}
          target="_blank"
          rel="noopener"
          class="text-sm text-blue-400 hover:underline break-all"
        >
          {website.replace(/^https?:\/\//, '')}
        </a>
      </div>
    )}
  </div>
); 