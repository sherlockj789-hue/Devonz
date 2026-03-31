import { lazy, Suspense } from 'react';
import { type MetaFunction } from 'react-router';
import { BaseChat } from '~/components/chat/BaseChat';
import { Header } from '~/components/header/Header';
import { clientLazy } from '~/utils/react';

const Chat = clientLazy(() => import('~/components/chat/Chat.client').then((m) => ({ default: m.Chat })));
const MigrationBanner = clientLazy(() =>
  import('~/components/chat/MigrationBanner.client').then((m) => ({ default: m.MigrationBanner })),
);
const UpdateBanner = lazy(() => import('~/components/ui/UpdateBanner').then((m) => ({ default: m.UpdateBanner })));

export const meta: MetaFunction = () => {
  return [
    { title: 'codibl' },
    { name: 'description', content: 'Talk with codibl, an AI-powered development platform' },
    { property: 'og:title', content: 'codibl' },
    { property: 'og:description', content: 'Talk with codibl, an AI-powered development platform' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/logo-dark-styled.png' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: 'codibl' },
    { name: 'twitter:description', content: 'Talk with codibl, an AI-powered development platform' },
  ];
};

export const loader = () => Response.json({});

/**
 * Landing page component for codibl
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <main
      id="main-content"
      className="flex flex-col h-full w-full overflow-hidden bg-devonz-elements-background-depth-1"
    >
      <Suspense fallback={null}>
        <MigrationBanner />
      </Suspense>
      <Suspense fallback={null}>
        <UpdateBanner />
      </Suspense>
      <Header />
      <Suspense fallback={<BaseChat />}>
        <Chat />
      </Suspense>
    </main>
  );
}
