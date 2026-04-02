import { getLandmarkPopupPlacement } from '../App';

describe('App popup helpers', () => {
  it('keeps landmark popups inside the frame near the top-left edge', () => {
    const placement = getLandmarkPopupPlacement({ x: 12, y: 20 }, { width: 900, height: 700 });

    expect(placement.left).toBe(18);
    expect(placement.top).toBe(86);
  });

  it('keeps landmark popups inside the frame near the bottom-right edge', () => {
    const placement = getLandmarkPopupPlacement({ x: 880, y: 690 }, { width: 900, height: 700 });

    expect(placement.left).toBe(576);
    expect(placement.top).toBeCloseTo(206, 6);
  });
});
