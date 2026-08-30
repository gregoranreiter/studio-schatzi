import { projects } from './projects';

type ClientLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  widthScale?: number;
};

export const clientLogos: ClientLogo[] = [
  ...projects.flatMap(({ title, logo }) => logo ? [{ name: title, ...logo }] : []),
  {
    name: 'Johannes Kepler Universität Linz',
    src: '/images/logos/jku.svg',
    width: 1566,
    height: 175,
    widthScale: 1.8,
  },
  {
    name: 'SCHÄXPIR Theaterfestival',
    src: '/images/logos/schaexpir.svg',
    width: 659,
    height: 226,
  },
];
