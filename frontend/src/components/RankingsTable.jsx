import { useReactTable, getCoreRowModel, flexRender, getSortedRowModel } from '@tanstack/react-table';
import { Table, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatRank, getRankBadgeVariant } from '../services/rankingService';

const RankingsTable = ({ data, onRowClick }) => {
    const { t } = useTranslation();

    const columns = [
        {
            accessorKey: 'rank',
            header: t('table.headers.rank'),
            cell: info => {
                const rank = info.getValue();
                return (
                    <Badge bg={getRankBadgeVariant(rank)} pill>
                        {formatRank(rank)}
                    </Badge>
                );
            }
        },
        {
            id: 'name',
            header: t('table.headers.name'),
            cell: info => {
                const entry = info.row.original;
                if (entry.entityType === 'PLAYER') {
                    const name = entry.player?.name || t('common.unknown');
                    const id = entry.player?.id;
                    return id ? <Link to={`/players/${id}`}>{name}</Link> : name;
                } else if (entry.entityType === 'PAIR') {
                    const p1Name = entry.pair?.player1?.name || '?';
                    const p1Id = entry.pair?.player1?.id;
                    const p2Name = entry.pair?.player2?.name || '?';
                    const p2Id = entry.pair?.player2?.id;
                    return (
                        <>
                            {p1Id ? <Link to={`/players/${p1Id}`}>{p1Name}</Link> : p1Name}
                            {' / '}
                            {p2Id ? <Link to={`/players/${p2Id}`}>{p2Name}</Link> : p2Name}
                        </>
                    );
                }
                return t('common.unknown');
            }
        },
        {
            accessorKey: 'totalPoints',
            header: t('table.headers.points'),
            cell: info => info.getValue().toLocaleString()
        },
        {
            accessorKey: 'tournamentCount',
            header: t('table.headers.tournaments'),
            cell: info => info.getValue()
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <Table hover responsive striped>
            <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr
                        key={row.id}
                        onClick={() => onRowClick && onRowClick(row.original)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default RankingsTable;
