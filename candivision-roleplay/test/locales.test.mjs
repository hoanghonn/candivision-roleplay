import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const load = (name) => JSON.parse(readFileSync(new URL(`../src/locales/${name}.json`, import.meta.url), "utf8"));
const flat = (o, prefix = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const en = Object.fromEntries(flat(load("en")));
const vi = Object.fromEntries(flat(load("vi")));
// Vietnamese has one plural form, so `x_one` and `x_other` in English are just `x_other` here.
const base = (k) => k.replace(/_(one|other)$/, "");
const vars = (s) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

test("every English string has a Vietnamese one, and nothing extra", () => {
  assert.deepEqual([...new Set(Object.keys(vi).map(base))].sort(), [...new Set(Object.keys(en).map(base))].sort());
});

test("Vietnamese uses only the plural form it has", () => {
  assert.deepEqual(Object.keys(vi).filter((k) => k.endsWith("_one")), []);
});

test("both languages fill in the same values", () => {
  for (const [k, v] of Object.entries(vi)) {
    const source = en[k] ?? en[`${base(k)}_other`];
    // A plural always has {{count}} available, and Vietnamese's single form may use it where English's wording doesn't.
    const drop = (list) => (k.endsWith("_other") ? list.filter((x) => x !== "count") : list);
    assert.deepEqual(drop(vars(v)), drop(vars(source)), k);
  }
});

test("no string is empty, and no string uses an em dash", () => {
  for (const [k, v] of Object.entries({ ...en, ...vi })) {
    assert.ok(v.trim(), k);
    assert.ok(!v.includes("\u2014"), k);
  }
});

test("the training-only promise is translated, not left in English", () => {
  for (const k of ["common.footer", "call.lobbyNote"]) assert.notEqual(vi[k], en[k], k);
});
