from __future__ import absolute_import

import mock

from changes.config import db
from changes.constants import Status
from changes.jobs.sync_build import sync_build
from changes.models import Job, Plan, Step, BuildFamily, JobPlan
from changes.testutils import TestCase


class SyncBuildTest(TestCase):
    @mock.patch('changes.jobs.sync_build.sync_with_builder')
    @mock.patch('changes.jobs.sync_build.queue.delay')
    @mock.patch.object(Step, 'get_implementation')
    def test_simple(self, get_implementation, queue_delay, sync_with_builder):
        implementation = mock.Mock()
        get_implementation.return_value = implementation

        job = self.create_job(self.project)

        plan = Plan(
            label='test',
        )
        db.session.add(plan)

        step = Step(
            plan=plan,
            implementation='test',
            order=0,
        )
        db.session.add(step)

        family = BuildFamily(
            project=job.project,
            repository=job.repository,
            revision_sha=job.revision_sha,
            label=job.label,
            author=job.author,
            target=job.target,
        )
        db.session.add(family)

        jobplan = JobPlan(
            plan=plan,
            family=family,
            job=job,
            project=self.project,
        )
        db.session.add(jobplan)

        sync_build(build_id=job.id.hex)

        get_implementation.assert_called_once_with()

        implementation.execute.assert_called_once_with(
            job=job,
        )

        job = Job.query.get(job.id)

        assert len(sync_with_builder.mock_calls) == 0

        # ensure signal is fired
        queue_delay.assert_any_call('sync_build', kwargs={
            'build_id': job.id.hex,
        }, countdown=5)

    @mock.patch('changes.jobs.sync_build.sync_with_builder')
    @mock.patch('changes.jobs.sync_build.queue.delay')
    def test_without_build_plan(self, queue_delay, sync_with_builder):
        def mark_finished(job):
            job.status = Status.finished

        sync_with_builder.side_effect = mark_finished

        job = self.create_job(self.project)

        sync_build(build_id=job.id.hex)

        job = Job.query.get(job.id)

        assert job.status == Status.finished

        # job sync is abstracted via sync_with_builder
        sync_with_builder.assert_called_once_with(job=job)

        # ensure signal is fired
        queue_delay.assert_any_call('update_project_stats', kwargs={
            'project_id': self.project.id.hex,
        }, countdown=1)

        queue_delay.assert_any_call('notify_listeners', kwargs={
            'build_id': job.id.hex,
            'signal_name': 'job.finished',
        })
