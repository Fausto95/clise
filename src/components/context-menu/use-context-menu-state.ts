import React from "react";
import type { MenuItem } from "./context-menu";

export const useContextMenuState = () => {
	const [open, setOpen] = React.useState(false);
	const [anchorPoint, setAnchorPoint] = React.useState<{
		x: number;
		y: number;
	} | null>(null);
	const [items, setItems] = React.useState<MenuItem[]>([]);

	const openAt = (point: { x: number; y: number }, nextItems: MenuItem[]) => {
		setAnchorPoint(point);
		setItems(nextItems);
		setOpen(true);
	};
	const close = () => setOpen(false);

	return { open, anchorPoint, items, openAt, close } as const;
};
