export const assertDefined: <T>(value: T | undefined | null, error?: string) => asserts value is T = <T>(
	value: T | undefined | null,
	error?: string,
) => {
	if (typeof value === 'number' || typeof value === 'boolean') {
		return;
	}

	if (!value) {
		throw new Error(error || 'Value is not defined');
	}
};

export function assertTrue(value: boolean, error?: string): asserts value is true {
	if (!value) {
		throw new Error(error || 'Value is falsy');
	}
}
