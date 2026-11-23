import { defineArea } from '../define';

export const pokeindex = defineArea({
  en: {
    'pi.intro':
      'Name the Pokémon from its Pokédex number. Each miss unlocks a hint: generation, then types, then the silhouette. {max} wrong guesses and it’s over.',
    'pi.which': 'Which Pokémon is this?',
    'pi.number': 'Pokédex number {n}',
    'pi.hints': 'Hints',
    'pi.gen': 'From:',
    'pi.type': 'Type:',
    'pi.silhouette': 'Silhouette',
    'pi.misses': 'Wrong guesses',
    'pi.higher': 'The answer has a higher number',
    'pi.lower': 'The answer has a lower number',
  },
  es: {
    'pi.intro':
      'Nombra al Pokémon por su número de la Pokédex. Cada fallo desbloquea una pista: generación, luego tipos y por último la silueta. {max} intentos fallidos y pierdes.',
    'pi.which': '¿Qué Pokémon es este?',
    'pi.number': 'Número de la Pokédex {n}',
    'pi.hints': 'Pistas',
    'pi.gen': 'De:',
    'pi.type': 'Tipo:',
    'pi.silhouette': 'Silueta',
    'pi.misses': 'Intentos fallidos',
    'pi.higher': 'La respuesta tiene un número mayor',
    'pi.lower': 'La respuesta tiene un número menor',
  },
});
