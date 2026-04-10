import { gameContent } from '../../content/gameContent';
import { applyAction, createDefaultMetaProgress, createInitialState, stepState } from '../logic';

function liveOffers(state: ReturnType<typeof createInitialState>) {
  return state.recruitOffers.filter((offer): offer is NonNullable<typeof offer> => offer !== null);
}

describe('current recruit flow', () => {
  it('starts a fresh run with an empty board, empty sauna, and four free recruit offers', () => {
    const state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);

    expect(state.defenders).toHaveLength(0);
    expect(state.saunaDefenderId).toBeNull();
    expect(state.recruitMarketIsFree).toBe(true);
    expect(liveOffers(state)).toHaveLength(4);
    expect(liveOffers(state).every((offer) => offer.price === 0)).toBe(true);
  });

  it('buys a free recruit into ready state and selects them for placement', () => {
    let state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const offer = liveOffers(state)[0];

    state = applyAction(state, { type: 'recruitOffer', offerId: offer.offerId }, gameContent);

    expect(state.defenders).toHaveLength(1);
    expect(state.defenders[0].id).toBe(offer.candidate.id);
    expect(state.defenders[0].location).toBe('ready');
    expect(state.selectedDefenderId).toBe(offer.candidate.id);
    expect(state.selectedMapTarget).toBe('defender');
    expect(liveOffers(state)).toHaveLength(3);
  });

  it('blocks recruiting another hero while a ready recruit is still waiting', () => {
    let state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const [firstOffer, secondOffer] = liveOffers(state);

    state = applyAction(state, { type: 'recruitOffer', offerId: firstOffer.offerId }, gameContent);
    state = applyAction(state, { type: 'recruitOffer', offerId: secondOffer.offerId }, gameContent);

    expect(state.defenders).toHaveLength(1);
    expect(state.message).toContain('Place or sauna');
    expect(liveOffers(state)).toHaveLength(3);
  });

  it('sends a recruit to sauna when the board is full and replaces the sauna hero when occupied', () => {
    let state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    const openingOffers = liveOffers(state);
    const boardTiles = [
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: -1, r: 0 },
      { q: 1, r: 0 }
    ];

    openingOffers.slice(0, 4).forEach((offer, index) => {
      offer.candidate.location = 'board';
      offer.candidate.tile = boardTiles[index];
      offer.candidate.homeTile = boardTiles[index];
      state.defenders.push(offer.candidate);
    });
    state.recruitOffers = [null, null, null, null];
    state.sisu.current = 30;

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const saunaOffer = liveOffers(state)[0];
    state = applyAction(state, { type: 'recruitOffer', offerId: saunaOffer.offerId }, gameContent);
    expect(state.saunaDefenderId).toBe(saunaOffer.candidate.id);
    expect(state.defenders.find((defender) => defender.id === saunaOffer.candidate.id)?.location).toBe('sauna');

    state = applyAction(state, { type: 'rerollRecruitOffers' }, gameContent);
    const replacementOffer = liveOffers(state)[0];
    const previousSaunaId = state.saunaDefenderId;
    state = applyAction(state, { type: 'recruitOffer', offerId: replacementOffer.offerId }, gameContent);

    expect(state.saunaDefenderId).toBe(replacementOffer.candidate.id);
    expect(state.defenders.some((defender) => defender.id === previousSaunaId)).toBe(false);
  });

  it('opens the metashop automatically when the run ends in intermission', () => {
    let state = createInitialState(gameContent, createDefaultMetaProgress(), 42, false);
    state.phase = 'wave';
    state.saunaHp = 1;
    state.enemies = [{
      instanceId: 1,
      archetypeId: 'raider',
      tokenStyleId: 0,
      tile: { q: 0, r: 1 },
      hp: 12,
      lastHitByDefenderId: null,
      attackReadyAtMs: 0,
      moveReadyAtMs: 999999
    }];
    state.pendingSpawns = [];

    state = stepState(state, 16, gameContent);

    expect(state.overlayMode).toBe('intermission');
    expect(state.activePanel).toBe('metashop');
    expect(state.selectedWorldLandmarkId).toBe('metashop');
  });
});
