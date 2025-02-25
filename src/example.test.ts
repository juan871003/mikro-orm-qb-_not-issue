import { Entity, MikroORM, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity()
class User {
  @PrimaryKey()
  id!: string;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  constructor(id: string, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

beforeEach(async () => {
  await orm.em.nativeDelete(User, {});
});

afterAll(async () => {
  await orm.close(true);
});

test('andWhere with _not when querying for ID as string', async () => {
  const id = '1';
  orm.em.create(User, { id, name: 'Foo', email: 'foo' });
  await orm.em.flush();
  orm.em.clear();

  const query = orm.em.createQueryBuilder(User);
  query.andWhere({ $not: { id } });
  const result = await query.getResult();

  // ❌ This fails because we get a SQL error: select "u0".* from "user" as "u0" where not ("u0"."0" = '1') - column u0.0 does not exist
  // So the resulting SQL is malformed, note the `"u0"."0" = '1'`
  expect(result).toHaveLength(0);
});

test('andWhere with _not when querying for ID as number', async () => {
  const id = '1';
  orm.em.create(User, { id, name: 'Bar', email: 'bar' });
  await orm.em.flush();
  orm.em.clear();

  const query = orm.em.createQueryBuilder(User);
  query.andWhere({ $not: { id: Number(id) } });
  const result = await query.getResult();

  // ❌ This fails because the result is [{"email": "bar", "id": "1", "name": "Bar"}] instead o []
  // This case may be expected, as we are passing a number but we should be passing a string
  // But I still wanted to point this out as it may help.
  expect(result).toHaveLength(0);
});

test('andWhere with _not when querying for ID with $eq', async () => {
  const id = '1';
  orm.em.create(User, { id, name: 'Bar', email: 'bar' });
  await orm.em.flush();
  orm.em.clear();

  const query = orm.em.createQueryBuilder(User);
  query.andWhere({ $not: { id: { $eq: id } } });
  const result = await query.getResult();

  // ✅ This passes (note that we are using $eq)
  expect(result).toHaveLength(0);
});

test('andWhere with _not when querying for something other than ID', async () => {
  const id = '1';
  orm.em.create(User, { id, name: 'Bar', email: 'bar' });
  await orm.em.flush();
  orm.em.clear();

  const query = orm.em.createQueryBuilder(User);
  query.andWhere({ $not: { name: 'Bar' } });
  const result = await query.getResult();

  // ✅ This passes, note that we are not using the ID field in the filter
  expect(result).toHaveLength(0);
});
