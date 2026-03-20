import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterSection from '../components/FilterSection';

const defaultProps = {
    selectedTypes: [],
    onTypeToggle: jest.fn(),
    typeMode: 'or' as const,
    onTypeModeChange: jest.fn(),
    selectedDietary: [],
    onDietaryToggle: jest.fn(),
    dietaryMode: 'or' as const,
    onDietaryModeChange: jest.fn(),
};

function renderFilter(props: Partial<React.ComponentProps<typeof FilterSection>> = {}) {
    return render(<FilterSection { ...defaultProps } { ...props } />);
}

describe('FilterSection', () => {
    beforeEach(() => jest.clearAllMocks());

    it('renders the toggle chip', () => {
        renderFilter();
        expect(screen.getByRole('button', { name: /mehr filter/i })).toBeInTheDocument();
    });

    it('popup is hidden initially', () => {
        renderFilter();
        expect(screen.queryByText('Rezepttyp')).not.toBeInTheDocument();
        expect(screen.queryByText('Ernährung')).not.toBeInTheDocument();
    });

    it('opens popup on chip click', async () => {
        renderFilter();
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        expect(screen.getByText('Rezepttyp')).toBeInTheDocument();
        expect(screen.getByText('Ernährung')).toBeInTheDocument();
    });

    it('shows all recipe type pills including Sonstiges', async () => {
        renderFilter();
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        for (const label of [ 'Kochen', 'Backen', 'Snack', 'Dessert', 'Sonstiges' ]) {
            expect(screen.getAllByRole('button', { name: label }).length).toBeGreaterThan(0);
        }
    });

    it('shows all dietary pills including Sonstiges', async () => {
        renderFilter();
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        for (const label of [ 'Vegan', 'Vegetarisch', 'Glutenfrei', 'Laktosefrei' ]) {
            expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
        }
        // Sonstiges appears for both groups
        expect(screen.getAllByRole('button', { name: 'Sonstiges' })).toHaveLength(2);
    });

    it('calls onTypeToggle when a type pill is clicked', async () => {
        const onTypeToggle = jest.fn();
        renderFilter({ onTypeToggle });
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        await userEvent.click(screen.getByRole('button', { name: 'Kochen' }));
        expect(onTypeToggle).toHaveBeenCalledWith('cooking');
    });

    it('calls onDietaryToggle when a dietary pill is clicked', async () => {
        const onDietaryToggle = jest.fn();
        renderFilter({ onDietaryToggle });
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        await userEvent.click(screen.getByRole('button', { name: 'Vegan' }));
        expect(onDietaryToggle).toHaveBeenCalledWith('vegan');
    });

    it('shows active count badge when filters are selected', () => {
        renderFilter({ selectedTypes: [ 'cooking' ], selectedDietary: [ 'vegan', 'glutenfree' ] });
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('calls onTypeModeChange when UND toggle is clicked', async () => {
        const onTypeModeChange = jest.fn();
        renderFilter({ onTypeModeChange });
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        const undButtons = screen.getAllByRole('button', { name: 'UND' });
        await userEvent.click(undButtons[0]);
        expect(onTypeModeChange).toHaveBeenCalledWith('and');
    });

    it('calls onDietaryModeChange when UND toggle is clicked for dietary', async () => {
        const onDietaryModeChange = jest.fn();
        renderFilter({ onDietaryModeChange });
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        const undButtons = screen.getAllByRole('button', { name: 'UND' });
        await userEvent.click(undButtons[1]);
        expect(onDietaryModeChange).toHaveBeenCalledWith('and');
    });

    it('closes popup when clicking outside', async () => {
        renderFilter();
        await userEvent.click(screen.getByRole('button', { name: /mehr filter/i }));
        expect(screen.getByText('Rezepttyp')).toBeInTheDocument();
        await userEvent.click(document.body);
        expect(screen.queryByText('Rezepttyp')).not.toBeInTheDocument();
    });
});
