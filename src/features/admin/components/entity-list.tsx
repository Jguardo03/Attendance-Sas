import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Select, Text, TextField } from '@/components/ui';

import { listRows } from '../api';
import type { EntityDef } from '../entities';
import { adminHref } from '../routes';

// Search, filter and "+ Add" over any entity. Rows open the details screen.
export function EntityList({ entity }: { entity: EntityDef }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const rows = useQuery({ queryKey: ['admin', entity.key, 'list'], queryFn: () => listRows(entity) });

  const filterOptions = useMemo(() => {
    if (!entity.filter) return [];
    const values = entity.filter.options ?? [...new Set((rows.data ?? []).map(entity.filter.value))].filter(Boolean);
    return [{ value: 'all', label: 'All' }, ...values.map((value) => ({ value, label: value }))];
  }, [entity.filter, rows.data]);

  const visible = (rows.data ?? []).filter((row) => {
    const matchesFilter = filter === 'all' || !entity.filter || entity.filter.value(row) === filter;
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || entity.searchColumns.some((column) => String(row[column] ?? '').toLowerCase().includes(needle));
    return matchesFilter && matchesSearch;
  });

  return (
    <View className="gap-4">
      <Button label={`+ Add ${entity.singular}`} onPress={() => router.push(adminHref(entity.key, 'new'))} />
      <TextField label="Search" value={search} onChangeText={setSearch} autoCapitalize="none" placeholder={`Search ${entity.label.toLowerCase()}`} />
      {entity.filter ? <Select label={entity.filter.label} value={filter} options={filterOptions} onChange={setFilter} /> : null}

      {rows.isPending ? <Text variant="muted">Loading...</Text> : null}
      {rows.isError ? <Text variant="error">Could not load {entity.label.toLowerCase()}.</Text> : null}
      {rows.data && visible.length === 0 ? (
        <Card>
          <Text variant="muted">{rows.data.length === 0 ? `No ${entity.label.toLowerCase()} yet.` : 'Nothing matches.'}</Text>
        </Card>
      ) : null}

      {visible.map((row) => (
        <Pressable
          key={String(row.id)}
          accessibilityRole="link"
          onPress={() => router.push(adminHref(entity.key, row.id))}>
          <Card>
            <Text variant="heading">{entity.title(row)}</Text>
            {entity.columns.map((column) => (
              <Text key={column.label} variant="muted">
                {column.label}: {column.value(row)}
              </Text>
            ))}
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
