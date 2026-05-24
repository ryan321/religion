/**
 * Shared logic for grouping books into ordered shelf sections.
 * Used by both CatalogGrid (Browse) and LibraryGrid (My Library).
 *
 * Each group has an explicit title and a list of members (series names
 * from the DB, or standalone subject tags) whose books go into that group.
 * Groups are rendered in the order defined here. Any books whose series
 * or primary subject isn't listed go into an "Other" group at the end.
 */

interface GroupDef {
  /** Display title for the shelf heading. */
  title: string;
  /** Series names or primary-subject tags that belong to this group. */
  members: string[];
  /** If true, render as a super-group with nested sub-shelves per member
   *  instead of one flat shelf. */
  nested?: boolean;
}

const GROUPS: GroupDef[] = [
  { title: "Economics", members: ["Economics for Kids"] },
  { title: "Business", members: ["Business for Kids", "Accounting for Kids"] },
  { title: "Investing", members: ["Investing for Kids"] },
  { title: "Probability & Statistics", members: ["Probability and Statistics for Kids"] },
  { title: "Risk", members: ["Risk"] },
  { title: "Civics & Law", members: ["American History", "Government", "Law"] },
  { title: "Conversation & Oration", members: ["Communication", "Oration", "Negotiation"] },
  { title: "Trivium", members: ["Grammar for Kids", "Logic for Kids", "Rhetoric for Kids"], nested: true },
  { title: "Science", members: ["Science"] },
];

export interface ShelfGroup<T = unknown> {
  name: string;
  books: T[];
}

export interface DisplaySection<T = unknown> {
  superTitle: string | null;
  shelves: ShelfGroup<T>[];
}

/** Minimal book shape needed for grouping. Both CatalogBook and LibraryBook
 *  satisfy this interface. */
export interface ShelfBook {
  seriesName: string | null;
  seriesOrder: number | null;
  subjects: string[] | null;
}

/** Look up which group a book belongs to by checking its series name and
 *  subject tags against the group members list. Returns the index into
 *  GROUPS or -1 if unmatched. */
function findGroupIndex(b: ShelfBook): number {
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    if (b.seriesName && g.members.includes(b.seriesName)) return i;
    if (!b.seriesName) {
      for (const tag of b.subjects ?? []) {
        if (g.members.includes(tag)) return i;
      }
    }
  }
  return -1;
}

/** Find which member a book matched on, for ordering within a flat shelf. */
function findMemberKey(b: ShelfBook, members: string[]): string {
  if (b.seriesName && members.includes(b.seriesName)) return b.seriesName;
  for (const tag of b.subjects ?? []) {
    if (members.includes(tag)) return tag;
  }
  return "";
}

export function buildSections<T extends ShelfBook>(books: T[]): DisplaySection<T>[] {
  // Bucket each book into its group index. -1 = unmatched.
  const buckets = new Map<number, T[]>();
  // For nested groups, also track per-member buckets.
  const nestedBuckets = new Map<number, Map<string, T[]>>();

  for (const b of books) {
    const gi = findGroupIndex(b);
    const list = buckets.get(gi) ?? [];
    list.push(b);
    buckets.set(gi, list);

    // Track per-member for nested groups
    if (gi >= 0 && GROUPS[gi].nested) {
      const memberKey = b.seriesName ?? b.subjects?.[0] ?? "Other";
      let memberMap = nestedBuckets.get(gi);
      if (!memberMap) { memberMap = new Map(); nestedBuckets.set(gi, memberMap); }
      const mlist = memberMap.get(memberKey) ?? [];
      mlist.push(b);
      memberMap.set(memberKey, mlist);
    }
  }

  const sections: DisplaySection<T>[] = [];

  // Emit defined groups in order
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i];
    const groupBooks = buckets.get(i);
    if (!groupBooks || groupBooks.length === 0) continue;

    if (g.nested) {
      // Render as super-group with sub-shelves per member
      const memberMap = nestedBuckets.get(i)!;
      const shelves: ShelfGroup<T>[] = [];
      // Emit in member order defined in the group
      for (const member of g.members) {
        const mbooks = memberMap.get(member);
        if (!mbooks || mbooks.length === 0) continue;
        mbooks.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
        shelves.push({ name: member.replace(/\s+for Kids$/i, ""), books: mbooks });
      }
      if (shelves.length > 0) {
        sections.push({ superTitle: g.title, shelves });
      }
    } else {
      // Sort by member order first, then by seriesOrder within each member
      const memberIndex = (b: T) => {
        const key = findMemberKey(b, g.members);
        const idx = g.members.indexOf(key);
        return idx === -1 ? g.members.length : idx;
      };
      groupBooks.sort((a, b) => {
        const mi = memberIndex(a) - memberIndex(b);
        if (mi !== 0) return mi;
        return (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0);
      });
      sections.push({ superTitle: null, shelves: [{ name: g.title, books: groupBooks }] });
    }
  }

  // Unmatched books go at the end
  const unmatched = buckets.get(-1);
  if (unmatched && unmatched.length > 0) {
    sections.push({ superTitle: null, shelves: [{ name: "Other", books: unmatched }] });
  }

  return sections;
}
