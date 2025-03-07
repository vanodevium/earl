import test from "ava";
import { createQuery, mutation, query } from "./index.js";
const compact = (str) => str.replace(/\s+/g, " ");

test("queryObject must have _type or _fields", (t) => {
  t.throws(() => {
    createQuery({});
  });
});

test("default has _type=query", (t) => {
  const q = createQuery({
    _fields: [{ thoughts: ["id", "name", "thought"] }],
  });

  t.is(compact(q.query), "query { thoughts { id name thought } }");
});

test("generates query", (t) => {
  const q = query({
    _fields: [{ thoughts: ["id", "name", "thought"] }],
  });

  t.is(compact(q), "query { thoughts { id name thought } }");
});

test("generates mutation", (t) => {
  const q = mutation({
    _type: "mutation",
    _fields: [{ thoughts: ["id", "name", "thought"] }],
  });

  t.is(compact(q), "mutation { thoughts { id name thought } }");
});

test("generates query where _fields is object", (t) => {
  const q = query({
    _fields: { thoughts: ["id", "name", "thought"] },
  });

  t.is(compact(q), "query { thoughts { id name thought } }");
});

test("generates query where _fields has underscored field", (t) => {
  const q = query({
    _fields: { _thoughts: ["id", "name", "thought"] },
  });

  t.is(compact(q), "query { }");
});

test("generates query where _fields values isn't object", (t) => {
  const q = query({
    _fields: [{ a: "b" }],
  });

  t.is(compact(q), "query { a }");
});

test("generates query where _arguments has null value", (t) => {
  const q = query({
    _fields: [
      {
        a: {
          _arguments: {
            b: null,
          },
        },
      },
    ],
  });

  t.is(compact(q), "query { a(b: null) }");
});

test("generates query where _arguments has string value", (t) => {
  const q = query({
    _fields: [
      {
        a: {
          _arguments: {
            b: "str",
          },
        },
      },
    ],
  });

  t.is(compact(q), 'query { a(b: "str") }');
});

test("generates query where _arguments has array value", (t) => {
  const q = query({
    _fields: [
      {
        a: {
          _arguments: {
            b: ["c", "d"],
          },
        },
      },
    ],
  });

  t.is(compact(q), 'query { a(b: ["c", "d"]) }');
});

test("generates query where _arguments has unexpected value", (t) => {
  const q = query({
    _fields: [
      {
        a: {
          _arguments: {
            b: BigInt(1),
          },
        },
      },
    ],
  });

  t.is(compact(q), "query { a(b: 1) }");
});

test("generates mutations", (t) => {
  const q = createQuery({
    _type: "mutation",
    _variables: {
      a: "ID",
      b: "String",
      c: "JSON",
      d: "String",
    },
    _fields: [
      {
        create_thought: {
          _fields: ["id"],
          _arguments: {
            a: "$a",
            b: "$b",
            c: {
              d: "$d",
            },
          },
        },
      },
    ],
  });

  t.is(
    compact(q.query),
    "mutation($a: ID, $b: String, $c: JSON, $d: String) { create_thought(a: $a, b: $b, c: {d: $d}) { id } }",
  );
});

test("generate query with undefined variables", (t) => {
  const q = createQuery({
    _type: "query",
    _variables: {
      id: "Int",
      name: "String",
      empty: null,
    },
    _fields: [
      {
        user: {
          _arguments: {
            id: "$id",
            name: "$name",
          },
          _fields: ["id", "name", "email"],
        },
      },
    ],
  });

  t.is(
    compact(q.query),
    "query($id: Int, $name: String) { user(id: $id, name: $name) { id name email } }",
  );
});

test("generates query with variables", (t) => {
  const q = createQuery(
    {
      _type: "query",
      _variables: {
        id: "Int",
      },
      _fields: [
        {
          thought: {
            _arguments: { id: "$id" },
            _fields: ["id", "name", "thought"],
          },
        },
      ],
    },
    {
      id: 1,
    },
  );

  t.is(
    compact(q.query),
    "query($id: Int) { thought(id: $id) { id name thought } }",
  );
  t.deepEqual(q.variables, { id: 1 });
});

test("generates query with sub fields selection", (t) => {
  const q = createQuery({
    _type: "query",
    _fields: [
      {
        orders: {
          _fields: [
            "id",
            "amount",
            {
              user: {
                _fields: [
                  "id",
                  "name",
                  "email",
                  {
                    address: ["city", "country"],
                  },
                  {
                    account: ["holder"],
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  });

  t.is(
    compact(q.query),
    "query { orders { id amount user { id name email address { city country } account { holder } } } }",
  );
});

test("generates multiple queries", (t) => {
  const q = createQuery({
    _type: "query",
    _fields: [
      {
        thoughts: ["id", "name", "thought"],
      },
      {
        prayers: ["id", "name", "prayer"],
      },
    ],
  });

  t.is(
    compact(q.query),
    "query { thoughts { id name thought } prayers { id name prayer } }",
  );
});

test("generates queries without extraneous brackets", (t) => {
  const q = createQuery({
    _type: "query",
    _fields: [
      {
        getFilteredUsers: {
          _fields: [
            {
              count: [],
            },
          ],
        },
      },
      {
        getFilteredPosts: {
          _fields: [
            {
              count: [],
            },
          ],
        },
      },
    ],
  });

  t.is(
    compact(q.query),
    "query { getFilteredUsers { count } getFilteredPosts { count } }",
  );
});

test("generates query with operation name", (t) => {
  const q = createQuery(
    {
      _type: "query",
      _name: "operation",
      _variables: {
        id: "ID",
      },
      _fields: [
        {
          getPublicationNames: {
            _arguments: {
              id: "$id",
            },
            _fields: ["name", "publishedAt"],
          },
        },
      ],
    },
    {
      id: 13,
    },
  );

  t.is(
    compact(q.query),
    "query operation($id: ID) { getPublicationNames(id: $id) { name publishedAt } }",
  );
  t.deepEqual(q.variables, { id: 13 });
});

test("generates query arguments with inline fragment", (t) => {
  const q = createQuery({
    _type: "query",
    _fields: [
      {
        thought: [
          "id",
          "name",
          "thought",
          {
            "... on FragmentType": ["grade"],
          },
        ],
      },
    ],
    operation: "thought",
    fields: [
      "id",
      "name",
      "thought",
      {
        operation: "FragmentType",
        fields: ["grade"],
        fragment: true,
      },
    ],
  });

  t.is(
    compact(q.query),
    "query { thought { id name thought ... on FragmentType { grade } } }",
  );
});

test("generates aliased nested queries", (t) => {
  const q = createQuery({
    _type: "query",
    _fields: [
      {
        singleRootQuery: {
          _fields: [
            {
              nestedQuery: ["whatever"],
            },
            {
              nestedQuery: {
                _alias: "duplicatedNestedQuery",
                _fields: ["whatever"],
              },
            },
          ],
        },
      },
    ],
  });

  t.is(
    compact(q.query),
    "query { singleRootQuery { nestedQuery { whatever } duplicatedNestedQuery: nestedQuery { whatever } } }",
  );
});
