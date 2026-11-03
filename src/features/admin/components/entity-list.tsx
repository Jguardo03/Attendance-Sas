import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, Dropdown, EmptyState, Grid, Text, TextField, Loading } from '@/components/ui';
import { shadows } from '@/theme/tokens';

import { listRows } from '../api';
import { rowId, type EntityDef } from '../entities';
import { adminHref } from '../routes';

// Search, filters and "+ Add" over any entity. Rows open the details screen.
export function EntityList({ entity }: { entity: EntityDef }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  // Chosen value per filter label; missing or 'all' means no filtering on that one.
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const rows = useQuery({ queryKey: ['admin', entity.key, 'list'], queryFn: () => listRows(entity) });

  const filters = useMemo(
    () =>
      (entity.filters ?? []).map((filter) => {
        const values = filter.options ?? [...new Set((rows.data ?? []).map(filter.value))].filter(Boolean).sort();
        return { filter, options: [{ value: 'all', label: 'All' }, ...values.map((value) => ({ value, label: value }))] };
      }),
    [entity.filters, rows.data],
  );

  const visible = (rows.data ?? []).filter((row) => {
    const matchesFilters = (entity.filters ?? []).every((filter) => {
      const value = chosen[filter.label] ?? 'all';
      return value === 'all' || filter.value(row) === value;
    });
    const needle = search.trim().toLowerCase();
    const haystack = entity.searchText ? entity.searchText(row) : entity.searchColumns.map((column) => String(row[column] ?? '')).join(' ');
    return matchesFilters && (!needle || haystack.toLowerCase().includes(needle));
  });

  return (
    <View className="gap-4">
      <Button label={`+ Add ${entity.singular}`} onPress={() => router.push(adminHref(entity.key, 'new'))} />
      <TextField label="Search" value={search} onChangeText={setSearch} autoCapitalize="none" placeholder={`Search ${entity.label.toLowerCase()}`} />
      {filters.map(({ filter, options }) => (
        <Dropdown
          key={filter.label}
          label={filter.label}
          value={chosen[filter.label] ?? 'all'}
          options={options}
          onChange={(value) => setChosen((current) => ({ ...current, [filter.label]: value }))}
        />
      ))}

      {rows.isPending ? <Loading /> : null}
      {rows.isError ? <Text variant="error">Could not load {entity.label.toLowerCase()}.</Text> : null}
      {rows.data && visible.length === 0 ? (
        <Card>
          <EmptyState
            image="classes"
            title={rows.data.length === 0 ? `No ${entity.label.toLowerCase()} yet` : 'Nothing matches'}
            message={rows.data.length === 0 ? `No ${entity.label.toLowerCase()} yet.` : 'Nothing matches.'}
          />
        </Card>
      ) : null}

      <Grid>
        {visible.map((row) => (
          <Pressable
            key={rowId(entity, row)}
            accessibilityRole="link"
            onPress={() => router.push(adminHref(entity.key, rowId(entity, row)))}
            className="flex-row items-center gap-3 rounded-card bg-surface p-4 active:opacity-90"
            style={{ boxShadow: shadows.card }}>
            <View className="flex-1 gap-0.5">
              <Text variant="card">{entity.title(row)}</Text>
              {entity.columns.map((column) => (
                <Text key={column.label} variant="meta">
                  {column.label}: {column.value(row)}
                </Text>
              ))}
            </View>
            <Icon name="chevronRight" size={20} color="contentMuted" />
          </Pressable>
        ))}
      </Grid>
    </View>
  );
}
