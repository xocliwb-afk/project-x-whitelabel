import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../services/proximity_event_source.dart';
import '../../application/active_tour_controller.dart';
import '../../application/active_tour_state.dart';

class ActiveTourScreen extends ConsumerStatefulWidget {
  final String tourId;

  const ActiveTourScreen({
    super.key,
    required this.tourId,
  });

  @override
  ConsumerState<ActiveTourScreen> createState() => _ActiveTourScreenState();
}

class _ActiveTourScreenState extends ConsumerState<ActiveTourScreen> {
  @override
  void initState() {
    super.initState();
    _loadActiveTour();
  }

  @override
  void didUpdateWidget(covariant ActiveTourScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.tourId != widget.tourId) {
      _loadActiveTour();
    }
  }

  void _loadActiveTour() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      ref.read(activeTourControllerProvider.notifier).load(widget.tourId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(activeTourControllerProvider);
    final controller = ref.read(activeTourControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Tour'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          children: [
            _StatusSection(state: state),
            const SizedBox(height: 16),
            _StopSection(state: state),
            const SizedBox(height: 16),
            _NarrationSection(state: state),
            const SizedBox(height: 16),
            _ActiveTourControls(
              state: state,
              onStart: controller.start,
              onPrevious: controller.previous,
              onNext: controller.advance,
              onEnd: controller.end,
              onSimulateApproaching: () => _simulateApproaching(state),
              onSimulateArrived: () => _simulateArrived(state),
            ),
          ],
        ),
      ),
    );
  }

  void _simulateApproaching(ActiveTourState state) {
    final tourId = state.tourId;
    final stop = state.currentStop;
    if (tourId == null || stop == null) {
      return;
    }

    ref.read(proximityEventSourceProvider).simulateApproaching(
          tourId: tourId,
          stop: stop,
        );
  }

  void _simulateArrived(ActiveTourState state) {
    final tourId = state.tourId;
    final stop = state.currentStop;
    if (tourId == null || stop == null) {
      return;
    }

    ref.read(proximityEventSourceProvider).simulateArrived(
          tourId: tourId,
          stop: stop,
        );
  }
}

class _StatusSection extends StatelessWidget {
  final ActiveTourState state;

  const _StatusSection({required this.state});

  @override
  Widget build(BuildContext context) {
    final tour = state.tour;

    return _Section(
      title: 'Runtime',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Status: ${state.status.name}',
            key: const ValueKey('active-tour-status'),
          ),
          if (state.status == ActiveTourStatus.loading) ...[
            const SizedBox(height: 12),
            const LinearProgressIndicator(
              key: ValueKey('active-tour-loading'),
            ),
          ],
          if (tour != null) ...[
            const SizedBox(height: 8),
            Text(
              tour.title,
              key: const ValueKey('active-tour-title'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
          if (state.errorMessage != null) ...[
            const SizedBox(height: 8),
            _RuntimeMessage(
              key: const ValueKey('active-tour-error'),
              message: state.errorMessage!,
              isError: true,
            ),
          ],
        ],
      ),
    );
  }
}

class _StopSection extends StatelessWidget {
  final ActiveTourState state;

  const _StopSection({required this.state});

  @override
  Widget build(BuildContext context) {
    final currentStop = state.currentStop;
    final nextStop = state.nextStop;
    final progress = currentStop == null
        ? 'No active stop'
        : 'Stop ${state.currentStopIndex + 1} of ${state.orderedStops.length}';

    return _Section(
      title: 'Stops',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            progress,
            key: const ValueKey('active-tour-progress'),
          ),
          const SizedBox(height: 8),
          Text(
            currentStop?.address ?? 'Current stop unavailable',
            key: const ValueKey('active-tour-current-stop'),
          ),
          const SizedBox(height: 8),
          Text(
            nextStop == null
                ? 'Next stop unavailable'
                : 'Next: ${nextStop.address}',
            key: const ValueKey('active-tour-next-stop'),
          ),
        ],
      ),
    );
  }
}

class _NarrationSection extends StatelessWidget {
  final ActiveTourState state;

  const _NarrationSection({required this.state});

  @override
  Widget build(BuildContext context) {
    return _Section(
      title: 'Narration',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            state.currentNarrationText ?? 'No narration selected',
            key: const ValueKey('active-tour-narration'),
          ),
          if (state.narrationErrorMessage != null) ...[
            const SizedBox(height: 8),
            _RuntimeMessage(
              key: const ValueKey('active-tour-narration-error'),
              message: state.narrationErrorMessage!,
              isError: false,
            ),
          ],
        ],
      ),
    );
  }
}

class _ActiveTourControls extends StatelessWidget {
  final ActiveTourState state;
  final VoidCallback onStart;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onEnd;
  final VoidCallback onSimulateApproaching;
  final VoidCallback onSimulateArrived;

  const _ActiveTourControls({
    required this.state,
    required this.onStart,
    required this.onPrevious,
    required this.onNext,
    required this.onEnd,
    required this.onSimulateApproaching,
    required this.onSimulateArrived,
  });

  @override
  Widget build(BuildContext context) {
    final hasTour = state.hasTour;
    final hasCurrentStop = state.currentStop != null;
    final canStart = state.status == ActiveTourStatus.ready && hasTour;
    final canMove = hasTour &&
        (state.status == ActiveTourStatus.ready ||
            state.status == ActiveTourStatus.driving ||
            state.status == ActiveTourStatus.narrating ||
            state.status == ActiveTourStatus.paused);

    return _Section(
      title: 'Controls',
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          FilledButton.icon(
            key: const ValueKey('active-tour-start'),
            onPressed: canStart ? onStart : null,
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start'),
          ),
          OutlinedButton.icon(
            key: const ValueKey('active-tour-previous'),
            onPressed: canMove && !state.isFirstStop ? onPrevious : null,
            icon: const Icon(Icons.skip_previous),
            label: const Text('Previous'),
          ),
          OutlinedButton.icon(
            key: const ValueKey('active-tour-next'),
            onPressed: canMove ? onNext : null,
            icon: const Icon(Icons.skip_next),
            label: const Text('Next'),
          ),
          OutlinedButton.icon(
            key: const ValueKey('active-tour-simulate-approaching'),
            onPressed: hasCurrentStop ? onSimulateApproaching : null,
            icon: const Icon(Icons.near_me_outlined),
            label: const Text('Simulate approaching'),
          ),
          OutlinedButton.icon(
            key: const ValueKey('active-tour-simulate-arrived'),
            onPressed: hasCurrentStop ? onSimulateArrived : null,
            icon: const Icon(Icons.place_outlined),
            label: const Text('Simulate arrived'),
          ),
          TextButton.icon(
            key: const ValueKey('active-tour-end'),
            onPressed: hasTour ? onEnd : null,
            icon: const Icon(Icons.stop_circle_outlined),
            label: const Text('End'),
          ),
        ],
      ),
    );
  }
}

class _RuntimeMessage extends StatelessWidget {
  final String message;
  final bool isError;

  const _RuntimeMessage({
    super.key,
    required this.message,
    required this.isError,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: isError
            ? colorScheme.errorContainer
            : colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Text(
          message,
          style: TextStyle(
            color:
                isError ? colorScheme.onErrorContainer : colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
