/**
 * Owned concern: assert actual SVG dependency marker geometry and edge styling.
 * @baseline GH-3920: Extract unchanged proof from the existing Shell composition spec.
 * @consequence Scenario order, fixtures and browser obligations remain owned by the spec.
 */
export function assertDependencyDirectionCues(): void {
  cy.get<SVGMarkerElement>('[data-slot="canvas-dependency-direction-cue"]')
    .should('have.length.at.least', 2)
    .should(($cues) => {
      for (const cue of $cues.toArray()) {
        const glyph = cue.querySelector<SVGPathElement>('path')!;
        const bounds = glyph.getBBox();
        const edgePath = cue
          .closest('.react-flow__edge')
          ?.querySelector<SVGPathElement>('.react-flow__edge-path');

        expect(cue.tagName.toLowerCase()).to.equal('marker');
        expect(cue.getAttribute('markerWidth')).to.equal('8');
        expect(cue.getAttribute('markerHeight')).to.equal('8');
        expect(cue.getAttribute('orient')).to.equal('auto');
        expect(cue.getAttribute('markerUnits')).to.equal('userSpaceOnUse');
        expect(bounds.width).to.equal(8);
        expect(bounds.height).to.equal(8);
        expect(cue.getAttribute('aria-hidden')).to.equal('true');
        expect(getComputedStyle(glyph).fill).to.equal(getComputedStyle(edgePath!).stroke);
        expect(getComputedStyle(cue).pointerEvents).to.equal('none');
        expect(edgePath?.getAttribute('marker-end')).to.equal(`url(#${cue.id})`);
      }
    });
}
