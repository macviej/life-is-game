import { PhoneContact } from '../types/game';

export const PHONE_CONTACTS: PhoneContact[] = [
  {
    id: 'coach_dre',
    name: 'Турник',
    role: 'Подтягивания и хват',
    avatarEmoji: '',
    accentColor: '#E5A3BD',
    bio: 'Базовые и продвинутые тренировки на перекладине.',
  },
  {
    id: 'doc_elena',
    name: 'Восстановление',
    role: 'Готовность мышц и здоровье',
    avatarEmoji: '',
    accentColor: '#30D158',
    bio: 'Отслеживание восстановления мышечных групп, суставов и разминки.',
  },
  {
    id: 'viktor_iron',
    name: 'Силовая',
    role: 'Отжимания, брусья и веса',
    avatarEmoji: '',
    accentColor: '#A88CE8',
    bio: 'Параллельные силовые тренировки на грудь, трицепс, кор и ноги.',
  },
  {
    id: 'zoe_pulse',
    name: 'Кардио',
    role: 'Выносливость и темп',
    avatarEmoji: '',
    accentColor: '#32ADE6',
    bio: 'Интервальное кардио, скакалка, бег и быстрые сеты.',
  },
];

export function getContactById(id: string): PhoneContact {
  return PHONE_CONTACTS.find((c) => c.id === id) ?? PHONE_CONTACTS[0];
}
