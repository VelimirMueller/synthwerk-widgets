export interface CardProps {
    eyebrow?: string;
    title?: string;
    href?: string;
    disabled?: boolean;
}
/**
 * Content card. Slots: `default` (body) and `footer`. With `href` the whole card is a link.
 * A disabled link card loses `href`, so it leaves the tab order.
 * `href` goes through `safeHref()`: an unsafe URL (`javascript:`, `data:` …) renders a plain
 * article, never a link.
 */
export declare const SwCard: import("vue").DefineSetupFnComponent<CardProps, {}, {}, CardProps & {}, import("vue").PublicProps>;
