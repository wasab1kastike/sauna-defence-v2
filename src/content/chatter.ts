import type { GameContent } from '../game/types';

export const speech: GameContent['speech'] = {
  defender: {
    allyDeath: [
      'Perkele, not like that.',
      'Nyt meni mies ja moodi.',
      'Ei saakeli, he went out steaming.',
      'That was expensive. Very expensive.',
      'Hold the line, saatana.'
    ],
    kill: [
      'Perkele, next one.',
      'Sauna wins again.',
      'Out you go, clown.',
      'Sit down and cool off.',
      'One less ongelma.'
    ]
  },
  beerShop: {
    bartender: [
      'Fresh one coming up.',
      'Cold beer, hot mistakes.',
      'House special. No refunds.',
      'That one kicks like a kiuas.',
      'Pouring danger with style.'
    ],
    defenderReaction: [
      'Now we are talking.',
      'Medicinal purposes only.',
      'Good. Morale patch deployed.',
      'Finally, proper strategy juice.',
      'One more and I see victory.'
    ]
  },
  bosses: {
    pebble: {
      intro: [
        'Pebble hungry. Sauna first.',
        'Tiny name, huge problem.',
        'Pebble smells beer.'
      ],
      proc: [
        'Crunch. Mine now.',
        'Bottle eaten. Mood improved.',
        'Pebble stacks. You panic.'
      ]
    },
    end_user_horde: {
      intro: [
        'We have a quick question.',
        'Just one tiny urgent thing.',
        'Hello support, are you open.'
      ],
      proc: [
        'Escalating user sentiment.',
        'Need help ASAP ASAP.',
        'This queue is now your problem.'
      ]
    },
    electric_bather: {
      intro: [
        'Wet floor, live wires.',
        'Safety is a suggestion.',
        'Shock therapy starts now.'
      ],
      proc: [
        'Conduct yourself accordingly.',
        'Chain reaction, baby.',
        'Sauna certified lightning.'
      ]
    },
    escalation_manager: {
      intro: [
        'Looping in everyone.',
        'Raising visibility immediately.',
        'This needs more stakeholders.'
      ],
      proc: [
        'Opening three new tickets.',
        'Adding follow-up actions.',
        'Please advise by yesterday.'
      ]
    }
  }
};
