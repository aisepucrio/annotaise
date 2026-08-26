'use client';

import Image from 'next/image';
import SidebarItem from './sidebar_item';
import { User, FolderKanban, Tags, LogOut, PanelLeftClose, PanelLeftOpen, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthActions } from '@/lib/authClient';
import { useIsAdmin } from '@/lib/AdminContext';
import { BookmarkPlus } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { useTranslations } from '@/i18n/use-translations';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const router = useRouter();
  const { removeTokens } = AuthActions();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslations();
  const canSeeProjects = isAdmin;

  const handleLogout = () => {
    removeTokens();
    router.push('/login');
  };

  return (
    <div className="flex">
      <aside
        className={`
          fixed top-0 left-0 h-screen
          bg-white
          shadow-xl
          rounded-r-l
          flex flex-col
          justify-between
          transition-all duration-300
          ${isOpen ? 'w-[15vw] min-w-42 max-w-84 pt-6 pr-6 pb-6 pl-0' : 'w-[5vw]  min-w-14 max-w-18 p-4 items-center'}
        `}
      >
        <div
          className={`
            flex items-center w-full ${isOpen ? 'mb-6 pl-6' : 'mb-2'}
            ${isOpen ? 'justify-between' : 'justify-center'}
          `}
        >
          {isOpen ? (
            <div className="w-full flex justify-center">
              <div className="relative w-full h-20 ">
                <Image src="/Medium_Full_Logo_Light.svg" alt="Logo" fill className="object-contain" />
              </div>
            </div>
          ) : (
            <div className="relative w-10 h-10 flex items-center justify-center group">
              <Image
                src="/Logo_Icon_Light.svg"
                alt="Logo"
                width={24}
                height={24}
                className="object-contain group-hover:opacity-0 transition-opacity duration-200"
              />
              <button
                type="button"
                onClick={onToggle}
                aria-label={t('sidebar.expand')}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-sm hover:bg-gray-100 transition-all duration-200"
              >
                <PanelLeftOpen size={24} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {isOpen ? (
          <div className="w-full flex items-center gap-2 mb-2 pl-6">
            <div className="flex-1 bg-gray-300 h-0.5 rounded-2xl" />
            <button
              type="button"
              onClick={onToggle}
              aria-label={t('sidebar.collapse')}
              className="flex items-center justify-center rounded-sm w-9 h-9 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <PanelLeftClose size={24} />
            </button>
            <div className="flex-1 bg-gray-300 h-0.5 rounded-2xl" />
          </div>
        ) : (
          <div className="w-full bg-gray-300 h-0.5 rounded-2xl mb-4" />
        )}

        <ul className="space-y-1 mt-3 w-full">
          {isAdmin ? (
            <SidebarItem
              icon={<User size={24} />}
              label={t('sidebar.users')}
              href="/users"
              alias="/users"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}

          {canSeeProjects ? (
            <SidebarItem
              icon={<FolderKanban size={24} />}
              label={t('sidebar.projects')}
              href="/projects"
              alias="/projects"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          {isAdmin ? (
            <SidebarItem
              icon={<BookmarkPlus size={24} />}
              label={t('sidebar.manageLabelings')}
              href="/labelings_manage"
              alias="/labelings_manage"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          <SidebarItem
            icon={<Tags size={24} />}
            label={t('sidebar.labelings')}
            href="/labelings"
            alias="/labelings"
            hover_color="blue"
            collapsed={!isOpen}
          />
        </ul>

        <div className="text-sm text-gray-500 mt-auto w-full space-y-1 pl-0">
          {isAdmin ? (
            <SidebarItem
              icon={<BookOpen size={24} />}
              label={t('sidebar.guide')}
              href="/guide"
              alias="/guide"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          <button type="button" className="text-sm text-red-400 mt-auto w-full space-y-1" onClick={handleLogout}>
            <SidebarItem
              icon={<LogOut size={24} />}
              label={t('sidebar.logout')}
              href="/login"
              alias="/logout"
              hover_color="red"
              collapsed={!isOpen}
            />
          </button>

          <div className={`${isOpen ? 'pl-6 pt-6' : 'pt-6'}`}>
            <div className=" w-full bg-gray-300 h-0.5 rounded-2xl" />
          </div>

          <div className={` ${isOpen ? 'pl-6' : 'flex justify-center'}`}>
            <LanguageToggle collapsed={!isOpen} />
          </div>
        </div>
      </aside>
    </div>
  );
}
