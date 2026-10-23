import { describe, expect, it } from "vitest";
import { pageWindow } from "./Pagination";

describe("pageWindow", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("keeps the first and last page and a window around the current one, marking gaps", () => {
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });

  it("does not mark a gap where only one number is missing", () => {
    expect(pageWindow(3, 6)).toEqual([1, 2, 3, 4, null, 6]);
    expect(pageWindow(4, 6)).toEqual([1, null, 3, 4, 5, 6]);
  });
});
